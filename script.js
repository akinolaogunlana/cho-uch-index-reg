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

  /* ===================== PASSPORT PREVIEW ===================== */
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
    img.style.borderRadius = "8px";
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

  /* ===================== PDF DOWNLOAD ===================== */
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
    const fields = [
      ["SURNAME", form.surname.value.toUpperCase()],
      ["FIRST NAME", form.firstname.value.toUpperCase()],
      ["OTHER NAMES", form.othernames.value.toUpperCase()],
      ["BLOOD GROUP", form.bloodgroup.value],
      ["O-LEVEL TYPE", form.olevel_type.value],
      ["O-LEVEL YEAR", form.olevel_year.value],
      ["REMARKS", form.remarks.value]
    ];

    fields.forEach(([l, v]) => {
      doc.text(`${l}: ${v}`, 20, y);
      y += 8;
    });

    doc.save(`CHO_${form.surname.value}_${form.bloodgroup.value}_${form.olevel_type.value}.pdf`);
  });

  /* ===================== ADMIN ===================== */
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
    }
  });

  /* ===================== DUPLICATE CHECK ===================== */
  async function checkDuplicate() {
    const surname = form.surname.value.trim().toUpperCase();
    const blood = form.bloodgroup.value;
    const olevel = form.olevel_type.value;

    if (!surname || !blood || !olevel) return false;

    const res = await fetch(SHEETBEST_URL);
    const data = await res.json();

    return data.find(r =>
      r.SURNAME === surname &&
      r.BLOOD_GROUP === blood &&
      r.OLEVEL_TYPE === olevel
    );
  }

  /* ===================== FORM SUBMIT ===================== */
  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    if (!form.bloodgroup.value || !form.olevel_type.value) {
      alert("Please select Blood Group and O-Level Type");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerText = "Checking records...";

    try {
      const duplicate = await checkDuplicate();
      if (duplicate) {
        alert("❌ Record already exists. Please retrieve and edit instead.");
        submitBtn.disabled = false;
        submitBtn.innerText = "SUBMIT";
        return;
      }

      const file = document.getElementById("passport").files[0];
      if (!file) throw "Passport required";

      submitBtn.innerText = "Uploading passport...";
      const cloudForm = new FormData();
      cloudForm.append("file", file);
      cloudForm.append("upload_preset", CLOUDINARY_PRESET);

      const cloudRes = await fetch(CLOUDINARY_URL, {
        method: "POST",
        body: cloudForm
      });

      const cloudData = await cloudRes.json();
      if (!cloudData.secure_url) throw "Upload failed";

      submitBtn.innerText = "Saving data...";

      const payload = [{
        SURNAME: form.surname.value.trim().toUpperCase(),
        FIRSTNAME: form.firstname.value.trim().toUpperCase(),
        OTHERNAMES: form.othernames.value.trim().toUpperCase(),
        BLOOD_GROUP: form.bloodgroup.value,
        OLEVEL_TYPE: form.olevel_type.value,
        OLEVEL_YEAR: form.olevel_year.value,
        PASSPORT: cloudData.secure_url,
        REMARKS: form.remarks.value
      }];

      const saveRes = await fetch(SHEETBEST_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!saveRes.ok) throw "Save failed";

      form.innerHTML = `
        <div style="text-align:center;padding:40px">
          <h2 style="color:green">✅ Submission Successful</h2>
          <p>You may now download your slip.</p>
          <button onclick="location.reload()">Submit Another</button>
        </div>
      `;

    } catch (err) {
      alert(err);
      submitBtn.disabled = false;
      submitBtn.innerText = "SUBMIT";
      console.error(err);
    }
  });

});