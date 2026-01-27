document.addEventListener("DOMContentLoaded", function () {

  const SHEETBEST_URL = "https://api.sheetbest.com/sheets/ceb9eddc-af9a-473a-9a32-f52c21c7f72b";
  const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dpsbwjw83/image/upload";
  const CLOUDINARY_PRESET = "cho_passports";
  const ADMIN_PASSWORD = "CHO@2026Secure!";

  const form = document.getElementById("indexForm");
  const submitBtn = form.querySelector("button[type='submit']");
  const downloadPDFBtn = document.getElementById("downloadPDFBtn");
  const adminLoginBtn = document.getElementById("adminLoginBtn");
  const downloadZipBtn = document.getElementById("downloadZipBtn");
  const previewContainer = document.getElementById("previewContainer");

  let passportDataUrl = "";

  /* ================= PASSPORT PREVIEW ================= */
  document.getElementById("passport").addEventListener("change", function () {
    previewContainer.innerHTML = "";
    const file = this.files[0];
    if (!file) return;

    if (!["image/jpeg", "image/png"].includes(file.type)) {
      alert("Only JPG/PNG images allowed.");
      this.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("Image too large (max 5MB).");
      this.value = "";
      return;
    }

    const img = document.createElement("img");
    img.style.maxWidth = "150px";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext("2d").drawImage(img, 0, 0);
      passportDataUrl = canvas.toDataURL("image/jpeg");
    };
    img.src = URL.createObjectURL(file);
    previewContainer.appendChild(img);
  });

  /* ================= PDF DOWNLOAD ================= */
  downloadPDFBtn.addEventListener("click", () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    let y = 20;

    doc.setFontSize(18);
    doc.text("CHO Indexing Form", 105, y, { align: "center" });
    y += 10;

    if (passportDataUrl) {
      doc.addImage(passportDataUrl, "JPEG", 80, y, 50, 50);
      y += 60;
    }

    doc.setFontSize(12);
    [
      ["SURNAME", form.surname.value],
      ["FIRSTNAME", form.firstname.value],
      ["BLOOD GROUP", form.bloodgroup.value],
      ["O-LEVEL TYPE", form.olevel_type.value]
    ].forEach(([l, v]) => {
      doc.text(`${l}: ${v}`, 20, y);
      y += 8;
    });

    doc.save(
      `CHO_${form.surname.value}_${form.bloodgroup.value}_${form.olevel_type.value}.pdf`
    );
  });

  /* ================= ADMIN ================= */
  function requireAdminAccess() {
    const entered = prompt("🔒 Admin Password:");
    if (entered !== ADMIN_PASSWORD) {
      alert("❌ Access Denied");
      return false;
    }
    return true;
  }

  adminLoginBtn.addEventListener("click", () => {
    if (requireAdminAccess()) {
      downloadZipBtn.style.display = "inline-block";
      adminLoginBtn.style.display = "none";
      alert("✅ Admin access granted");
    }
  });

  /* ================= ZIP DOWNLOAD ================= */
  downloadZipBtn.addEventListener("click", async () => {
    if (!requireAdminAccess()) return;

    const res = await fetch(SHEETBEST_URL);
    const data = await res.json();
    const zip = new JSZip();
    const folder = zip.folder("passports");

    data.forEach((r, i) => {
      if (r.PASSPORT) {
        fetch(r.PASSPORT)
          .then(res => res.blob())
          .then(blob => {
            folder.file(
              `${r.SURNAME}_${r.BLOOD_GROUP}_${r.OLEVEL_TYPE}_${i + 1}.jpg`,
              blob
            );
          });
      }
    });

    const content = await zip.generateAsync({ type: "blob" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(content);
    a.download = "CHO_Passports.zip";
    a.click();
  });

  /* ================= LIVE DUPLICATE CHECK ================= */
  async function checkDuplicateLive() {
    const sInput = form.surname;
    const bInput = form.bloodgroup;
    const oInput = form.olevel_type;

    let warning = document.getElementById("duplicateWarning");
    if (!warning) {
      warning = document.createElement("div");
      warning.id = "duplicateWarning";
      warning.style.color = "red";
      submitBtn.before(warning);
    }

    async function validate() {
      const s = sInput.value.trim().toUpperCase();
      const b = bInput.value;
      const o = oInput.value;
      if (!s || !b || !o) return;

      const res = await fetch(SHEETBEST_URL);
      const data = await res.json();

      const duplicate = data.find(
        r => r.SURNAME === s && r.BLOOD_GROUP === b && r.OLEVEL_TYPE === o
      );

      if (duplicate) {
        warning.textContent = "❌ Duplicate record detected.";
        submitBtn.disabled = true;
      } else {
        warning.textContent = "";
        submitBtn.disabled = false;
      }
    }

    sInput.addEventListener("input", validate);
    bInput.addEventListener("change", validate);
    oInput.addEventListener("change", validate);
  }

  checkDuplicateLive();

  /* ================= SUBMISSION ================= */
  form.addEventListener("submit", async e => {
    e.preventDefault();
    submitBtn.disabled = true;

    const res = await fetch(SHEETBEST_URL);
    const data = await res.json();

    const s = form.surname.value.trim().toUpperCase();
    const b = form.bloodgroup.value;
    const o = form.olevel_type.value;

    const duplicate = data.find(
      r => r.SURNAME === s && r.BLOOD_GROUP === b && r.OLEVEL_TYPE === o
    );

    if (duplicate) {
      alert("❌ Record already exists. Please use EDIT.");
      submitBtn.disabled = false;
      return;
    }

    alert("✅ Validation passed. Data will be saved.");
  });

});