// eventHandler.js
import { loadData, loadExistingDataFromBackend, deleteMawb } from './dataHandler.js';
import { renderMawb, renderHawb, exportToExcelByDate } from './uiRenderer.js';

// Funciones para mostrar/ocultar indicador de carga
function showLoading() {
  document.getElementById('loading').classList.add('show');
}

function hideLoading() {
  document.getElementById('loading').classList.remove('show');
}

// Helper para convertir fecha local a formato ISO YYYY-MM-DD
function getLocalDateISO() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function setupEventListeners() {
  // Cargar datos existentes al abrir la página (sin subir Excel).
  showLoading();
  loadExistingDataFromBackend()
    .then(() => {
      renderMawb();
      hideLoading();
    })
    .catch((err) => {
      // No bloquea la app: si falla el backend, al menos se podrá subir Excel.
      console.error("No se pudieron cargar datos existentes:", err);
      hideLoading();
    });

  document.getElementById("fileInput").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    showLoading();
    try {
      await loadData(file);
      renderMawb();
    } finally {
      hideLoading();
    }
  });

  document.addEventListener("click", function(e) {
    const element = e.target;
    const regElement = element.closest(".reg");
    const popupBackdrop = element.closest(".popup_backdrop");
    const btnClose = element.closest(".btn-close");
    const deleteBtn = element.closest(".delete-mawb-btn");

    if (deleteBtn) {
      const mawb = deleteBtn.getAttribute("data-mawb");
      if (mawb && confirm(`¿Estás seguro de que quieres borrar el MAWB ${mawb}? Esta acción no se puede deshacer.`)) {
        showLoading();
        deleteMawb(mawb)
          .then(() => {
            renderMawb();
            hideLoading();
          })
          .catch((err) => {
            console.error("Error borrando MAWB:", err);
            hideLoading();
          });
      }
      return; // Evitar que se abra el popup
    }

    if (regElement && regElement.className.includes("reg")) {
      const mawb = regElement.querySelector(".mawb")?.textContent;
      if (mawb) {
        renderHawb(mawb);
      }
    }
    
    if (btnClose) {
      document.querySelector(".popup_backdrop").classList.add("hidden");
    }
    
    if (popupBackdrop && popupBackdrop.className.includes("popup_backdrop") && !e.target.closest(".popup-card")) {
      popupBackdrop.classList.add("hidden");
    }
  });

  // PRIMER FILTRO
  const mawbFilter = document.getElementById("mawb-filter");
  mawbFilter.addEventListener('input', function(e) {
    const filterValue = mawbFilter.value.trim();
    const all_regs = document.querySelectorAll(".reg");

    all_regs.forEach(reg => {
      const mawb = reg.querySelector(".mawb")?.textContent;

      if (filterValue === "" || mawb?.includes(filterValue)) {
        reg.classList.remove("hidden");
      } else {
        reg.classList.add("hidden");
      }
    });
  });

  // FILTRO POR FECHA
  const dateFilter = document.getElementById("mawb-date-filter");
  dateFilter.addEventListener('input', function(e) {
    let dateValue = dateFilter.value;
    const all_regs = document.querySelectorAll(".reg");

    all_regs.forEach(reg => {
      const regDate = reg.querySelector(".awb-date")?.textContent?.trim() || "";

      if (dateValue === "") {
        reg.classList.remove("hidden");
      } else {
        // Convertir ISO (YYYY-MM-DD) a colombiano (DD/MM/YYYY) para comparar
        let colombianDateValue = dateValue;
        if (dateValue.includes('-')) {
          const [year, month, day] = dateValue.split('-');
          colombianDateValue = `${day}/${month}/${year}`;
        }
        
        if (regDate === colombianDateValue) {
          reg.classList.remove("hidden");
        } else {
          reg.classList.add("hidden");
        }
      }
    });
  });

  const exportExcelBtn = document.getElementById("export-excel-btn");
  exportExcelBtn.addEventListener('click', function() {
    const selectedDate = dateFilter.value || getLocalDateISO();
    exportToExcelByDate(selectedDate);
  });

  // SEGUNDO FILTRO
  const hawbFilter = document.getElementById("hawb-filter");
  hawbFilter.addEventListener('input', function(e) {
    const filterValue = hawbFilter.value.trim();
    const all_rows = document.querySelectorAll(".row");

    all_rows.forEach(row => {
      const hawb = row.querySelector(".hawb")?.textContent;

      if (filterValue === "" || hawb?.includes(filterValue)) {
        row.classList.remove("hidden");
      } else {
        row.classList.add("hidden");
      }
    });
  });
}
