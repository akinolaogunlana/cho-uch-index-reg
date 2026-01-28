const SHEETBEST_URL =
"https://api.sheetbest.com/sheets/ceb9eddc-af9a-473a-9a32-f52c21c7f72b";

const ADMIN_PASSWORD = "CHO@2026Secure!";

const tableBody = document.getElementById("tableBody");
const searchBox = document.getElementById("searchBox");

let allRecords = [];

/* ================= PASSWORD ================= */

const pass = prompt("Enter admin password:");

if (pass !== ADMIN_PASSWORD) {
  alert("Access denied");
  location.href = "index.html";
}

/* ================= LOAD DATA ================= */

async function loadData() {
  const res = await fetch(SHEETBEST_URL);
  allRecords = await res.json();
  drawTable(allRecords);
}

function drawTable(data) {
  tableBody.innerHTML = "";

  data.forEach((r, i) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${i + 1}</td>
      <td>${r.SURNAME || ""}</td>
      <td>${r.FIRSTNAME || ""}</td>
      <td>${r.BLOOD_GROUP || ""}</td>
      <td>${r.OLEVEL_TYPE || ""}</td>
      <td>
        <button onclick="editRecord('${r.ID}')">
          Edit
        </button>
      </td>
    `;

    tableBody.appendChild(tr);
  });
}

/* ================= SEARCH ================= */

searchBox.addEventListener("input", () => {
  const q = searchBox.value.toUpperCase();

  const filtered = allRecords.filter(r =>
    (r.SURNAME || "").includes(q) ||
    (r.FIRSTNAME || "").includes(q)
  );

  drawTable(filtered);
});

/* ================= EDIT ================= */

function editRecord(id) {
  localStorage.setItem("editID", id);
  window.location.href = "index.html";
}

loadData();