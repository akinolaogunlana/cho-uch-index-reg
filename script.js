document.addEventListener("DOMContentLoaded", function () {

  // ---------------- Configuration ----------------
  const SHEETBEST_URL = "https://api.sheetbest.com/sheets/ceb9eddc-af9a-473a-9a32-f52c21c7f72b";
  const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dpsbwjw83/image/upload";
  const CLOUDINARY_PRESET = "cho_passports";
  const ADMIN_PASSWORD = "CHO@2026Secure!";

  // ---------------- Form Elements ----------------
  const form = document.getElementById("indexForm");
  const submitBtn = form.querySelector("button[type='submit']");
  const downloadPDFBtn = document.getElementById("downloadPDFBtn");
  const adminLoginBtn = document.getElementById("adminLoginBtn");
  const downloadZipBtn = document.getElementById("downloadZipBtn");
  const previewContainer = document.getElementById("previewContainer");

  let passportDataUrl = "";

  // ---------------- Passport Preview ----------------
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
    img.style.boxShadow = "0 4px 15px rgba(0,0,0,0.15)";
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

  // ---------------- PDF Download ----------------
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
      ["FIRSTNAME", form.firstname.value.toUpperCase()],
      ["OTHERNAMES", form.othernames.value.toUpperCase()],
      ["CADRE", form.cadre.value],
      ["GENDER", form.gender.value],
      ["BLOOD GROUP", form.bloodgroup.value],
      ["STATE", form.state.value],
      ["LGA / CITY/TOWN", form.lga_city_town.value],
      ["DATE OF BIRTH", form.dob.value],
      ["O-LEVEL TYPE", form.olevel_type.value],
      ["O-LEVEL YEAR", form.olevel_year.value],
      ["O-LEVEL EXAM NO.", form.olevel_exam.value],
      ["A-LEVEL TYPE", form.alevel_type.value],
      ["A-LEVEL YEAR", form.alevel_year.value],
      ["PROFESSIONAL CERT. NO.", form.pro_cert.value],
      ["ENGLISH", `${document.getElementById("engGrade").value} (${document.getElementById("engBody").value})`],
      ["MATHEMATICS", `${document.getElementById("mathGrade").value} (${document.getElementById("mathBody").value})`],
      ["BIOLOGY", document.getElementById("bioGrade").value ? `${document.getElementById("bioGrade").value} (${document.getElementById("bioBody").value})` : ""],
      ["CHEMISTRY", document.getElementById("chemGrade").value ? `${document.getElementById("chemGrade").value} (${document.getElementById("chemBody").value})` : ""],
      ["PHYSICS", document.getElementById("phyGrade").value ? `${document.getElementById("phyGrade").value} (${document.getElementById("phyBody").value})` : ""],
      ["REMARKS", form.remarks.value]
    ];

    fields.forEach(([label, value]) => {
      doc.text(`${label}: ${value}`, 20, y);
      y += 8;
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
    });

    doc.save(`CHO_Form_${form.surname.value}_${form.firstname.value}.pdf`);
  });

  // ---------------- Admin Access ----------------
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

  // ---------------- Bulk ZIP Download ----------------
  downloadZipBtn.addEventListener("click", async () => {
    if (!requireAdminAccess()) return;
    downloadZipBtn.disabled = true;
    downloadZipBtn.innerText = "Preparing ZIP...";

    try {
      const res = await fetch(SHEETBEST_URL);
      const allData = await res.json();
      const zip = new JSZip();
      const imgFolder = zip.folder("passports");

      for (let i = 0; i < allData.length; i++) {
        const record = allData[i];
        if (record.PASSPORT) {
          const imgRes = await fetch(record.PASSPORT);
          const blob = await imgRes.blob();
          const name = `${record.SURNAME}_${record.FIRSTNAME}_${i + 1}.jpg`;
          imgFolder.file(name, blob);
        }
      }

      const content = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(content);
      a.download = "CHO_Passports.zip";
      a.click();
    } catch (err) {
      alert("Failed to create ZIP");
      console.error(err);
    } finally {
      downloadZipBtn.disabled = false;
      downloadZipBtn.innerText = "Download All Passports (ZIP)";
    }
  });

  // ---------------- Live Duplicate Check ----------------
  async function checkDuplicateLive() {
    const surnameInput = form.surname;
    const bloodInput = form.bloodgroup;
    const olevelInput = form.olevel_type;

    let warning = document.getElementById("duplicateWarning");
    if (!warning) {
      warning = document.createElement("div");
      warning.id = "duplicateWarning";
      warning.style.color = "red";
      warning.style.marginTop = "5px";
      surnameInput.parentNode.insertBefore(warning, submitBtn);
    }

    async function validate() {
      const s = surnameInput.value.trim().toUpperCase();
      const b = bloodInput.value.trim().toUpperCase();
      const o = olevelInput.value.trim().toUpperCase();

      if (!s || !b || !o) {
        warning.textContent = "";
        submitBtn.disabled = false;
        surnameInput.style.borderColor = "";
        bloodInput.style.borderColor = "";
        olevelInput.style.borderColor = "";
        return;
      }

      try {
        const res = await fetch(SHEETBEST_URL);
        const allData = await res.json();

        const duplicate = allData.find(r =>
          r.SURNAME === s && r.BLOOD_GROUP === b && r.OLEVEL_TYPE.toUpperCase() === o
        );

        if (duplicate) {
          warning.textContent = "❌ Duplicate entry detected!";
          submitBtn.disabled = false; // allow edit
          surnameInput.style.borderColor = "red";
          bloodInput.style.borderColor = "red";
          olevelInput.style.borderColor = "red";

          // Pre-fill form with existing data for editing
          form.firstname.value = duplicate.FIRSTNAME || "";
          form.othernames.value = duplicate.OTHERNAMES || "";
          form.state.value = duplicate.STATE || "";
          form.lga_city_town.value = duplicate.LGA_CITY_TOWN || "";
          form.dob.value = duplicate.DATE_OF_BIRTH || "";
          form.olevel_year.value = duplicate.OLEVEL_YEAR || "";
          form.olevel_exam.value = duplicate.OLEVEL_EXAM_NUMBER || "";
          form.alevel_type.value = duplicate.ALEVEL_TYPE || "";
          form.alevel_year.value = duplicate.ALEVEL_YEAR || "";
          form.pro_cert.value = duplicate.PROFESSIONAL_CERTIFICATE_NUMBER || "";
          form.remarks.value = duplicate.REMARKS || "";
          if (duplicate.PASSPORT) {
            passportDataUrl = duplicate.PASSPORT;
            previewContainer.innerHTML = `<img src="${duplicate.PASSPORT}" style="max-width:150px;border-radius:8px;box-shadow:0 4px 15px rgba(0,0,0,0.15)">`;
          }
        } else {
          warning.textContent = "";
          surnameInput.style.borderColor = "";
          bloodInput.style.borderColor = "";
          olevelInput.style.borderColor = "";
          passportDataUrl = "";
          previewContainer.innerHTML = "";
        }
      } catch (err) {
        console.error("Failed to check duplicates:", err);
      }
    }

    surnameInput.addEventListener("input", validate);
    bloodInput.addEventListener("input", validate);
    olevelInput.addEventListener("change", validate);
  }

  checkDuplicateLive();

  // ---------------- Form Submission ----------------
  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    submitBtn.disabled = true;
    submitBtn.innerText = "Saving...";

    const s = form.surname.value.trim().toUpperCase();
    const b = form.bloodgroup.value.trim().toUpperCase();
    const o = form.olevel_type.value.trim().toUpperCase();

    if (!s || !b || !o) {
      alert("Please fill SURNAME, BLOOD GROUP, and O-LEVEL TYPE");
      submitBtn.disabled = false;
      return;
    }

    try {
      const fileInput = document.getElementById("passport");
      let passportUrl = passportDataUrl;

      // If new file uploaded, upload to Cloudinary
      if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        const cloudForm = new FormData();
        cloudForm.append("file", file);
        cloudForm.append("upload_preset", CLOUDINARY_PRESET);
        const cloudRes = await fetch(CLOUDINARY_URL, { method: "POST", body: cloudForm });
        const cloudData = await cloudRes.json();
        passportUrl = cloudData.secure_url;
      }

      // Fetch existing data to determine if update
      const res = await fetch(SHEETBEST_URL);
      const allData = await res.json();
      const duplicateIndex = allData.findIndex(r =>
        r.SURNAME === s && r.BLOOD_GROUP === b && r.OLEVEL_TYPE.toUpperCase() === o
      );

      const recordData = {
        SURNAME: s,
        FIRSTNAME: form.firstname.value.trim().toUpperCase(),
        OTHERNAMES: form.othernames.value.trim().toUpperCase(),
        PASSPORT: passportUrl,
        CADRE: form.cadre.value,
        GENDER: form.gender.value,
        BLOOD_GROUP: b,
        STATE: form.state.value,
        LGA_CITY_TOWN: form.lga_city_town.value,
        DATE_OF_BIRTH: form.dob.value,
        OLEVEL_TYPE: o,
        OLEVEL_YEAR: form.olevel_year.value,
        OLEVEL_EXAM_NUMBER: form.olevel_exam.value,
        ALEVEL_TYPE: form.alevel_type.value,
        ALEVEL_YEAR: form.alevel_year.value,
        PROFESSIONAL_CERTIFICATE_NUMBER: form.pro_cert.value,
        ENGLISH: `${document.getElementById("engGrade").value} (${document.getElementById("engBody").value})`,
        MATHEMATICS: `${document.getElementById("mathGrade").value} (${document.getElementById("mathBody").value})`,
        BIOLOGY: document.getElementById("bioGrade").value ? `${document.getElementById("bioGrade").value} (${document.getElementById("bioBody").value})` : "",
        CHEMISTRY: document.getElementById("chemGrade").value ? `${document.getElementById("chemGrade").value} (${document.getElementById("chemBody").value})` : "",
        PHYSICS: document.getElementById("phyGrade").value ? `${document.getElementById("phyGrade").value} (${document.getElementById("phyBody").value})` : "",
        REMARKS: form.remarks.value
      };

      let response;
      if (duplicateIndex !== -1) {
        // Update existing record
        const existingRecord = allData[duplicateIndex];
        response = await fetch(`${SHEETBEST_URL}/${existingRecord.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(recordData)
        });
      } else {
        // Create new record
        response = await fetch(SHEETBEST_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify([recordData])
        });
      }

      if (!response.ok) throw "Failed to save record";

      form.innerHTML = `
        <div style="text-align:center;padding:40px">
          <h2 style="color:#2ecc71">✅ Submission Successful</h2>
          <p>Your information has been saved successfully.</p>
          <p style="color:red;font-weight:bold;">⚠️ Admin will only accept your information after receiving your registration payment.</p>
          <button onclick="location.reload()">Submit / Edit Another</button>
        </div>
      `;

    } catch (err) {
      alert(err);
      submitBtn.disabled = false;
      submitBtn.innerText = "SUBMIT / UPDATE";
      console.error(err);
    }
  });

});