document.addEventListener("DOMContentLoaded", () => {

  // ================= CONFIG =================
  const SHEETBEST_URL =
    "https://api.sheetbest.com/sheets/ceb9eddc-af9a-473a-9a32-f52c21c7f72b";

  const CLOUDINARY_URL =
    "https://api.cloudinary.com/v1_1/dpsbwjw83/image/upload";

  const CLOUDINARY_PRESET = "cho_passports";

  const form = document.getElementById("indexForm");
  const submitBtn = form.querySelector("button[type='submit']");
  const previewContainer = document.getElementById("previewContainer");

  let passportDataUrl = "";
  let currentRowId = null; // 🔑 for update


  // ================= PASSPORT PREVIEW =================
  document.getElementById("passport").addEventListener("change", function () {

    const file = this.files[0];
    if (!file) return;

    if (!["image/jpeg", "image/png"].includes(file.type)) {
      alert("Only JPG or PNG allowed");
      this.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Maximum 5MB allowed");
      this.value = "";
      return;
    }

    const img = document.createElement("img");
    img.src = URL.createObjectURL(file);
    img.style.maxWidth = "150px";
    img.style.borderRadius = "8px";

    previewContainer.innerHTML = "";
    previewContainer.appendChild(img);
  });


  // ================= SEARCH RECORD =================
  document.getElementById("searchBtn").addEventListener("click", async () => {

    const surname =
      document.getElementById("searchSurname").value.trim().toUpperCase();
    const blood =
      document.getElementById("searchBloodGroup").value;
    const olevel =
      document.getElementById("searchOlevelType").value;

    if (!surname || !blood || !olevel) {
      document.getElementById("searchWarning").innerText =
        "Please fill surname, blood group and O-Level type.";
      return;
    }

    document.getElementById("searchWarning").innerText = "";

    const res = await fetch(SHEETBEST_URL);
    const data = await res.json();

    const record = data.find(r =>
      r.SURNAME?.toUpperCase() === surname &&
      r.BLOOD_GROUP === blood &&
      r.OLEVEL_TYPE === olevel
    );

    if (!record) {
      document.getElementById("searchWarning").innerText =
        "No record found.";
      return;
    }

    // 🔑 store row id
    currentRowId = record.id;

    // ===== Autofill ALL fields =====
    for (let el of form.elements) {
      const key = el.name?.toUpperCase();
      if (key && record[key] !== undefined) {
        el.value = record[key];
      }
    }

    // ===== Passport =====
    if (record.PASSPORT) {
      passportDataUrl = record.PASSPORT;
      previewContainer.innerHTML = `
        <img src="${record.PASSPORT}"
             style="max-width:150px;border-radius:8px;">
      `;
    }

    alert("✅ Full record loaded successfully");
  });


  // ================= SUBMIT =================
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    submitBtn.disabled = true;
    submitBtn.innerText = "Saving...";

    try {

      // ===== DOB check =====
      const dob = form.dob.value.trim();
      if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dob)) {
        throw "Date must be DD/MM/YYYY";
      }

      // ===== Passport upload =====
      let passportUrl = passportDataUrl;

      const file = document.getElementById("passport").files[0];
      if (file) {

        const fd = new FormData();
        fd.append("file", file);
        fd.append("upload_preset", CLOUDINARY_PRESET);

        const upload = await fetch(CLOUDINARY_URL, {
          method: "POST",
          body: fd
        });

        const result = await upload.json();

        if (!result.secure_url) {
          throw "Passport upload failed";
        }

        passportUrl = result.secure_url;
      }

      // ===== Record object =====
      const record = {
        SURNAME: form.surname.value.toUpperCase(),
        FIRSTNAME: form.firstname.value.toUpperCase(),
        OTHERNAMES: form.othernames.value.toUpperCase(),
        BLOOD_GROUP: form.bloodgroup.value,
        OLEVEL_TYPE: form.olevel_type.value,
        OLEVEL_YEAR: form.olevel_year.value,
        OLEVEL_EXAM_NUMBER: form.olevel_exam.value,
        CADRE: "CHO",
        GENDER: form.gender.value,
        STATE: form.state.value,
        LGA_CITY_TOWN: form.lga_city_town.value,
        DATE_OF_BIRTH: dob,
        PASSPORT: passportUrl,

        ENGLISH: `${form.engGrade.value} (${form.engBody.value})`,
        MATHEMATICS: `${form.mathGrade.value} (${form.mathBody.value})`,
        BIOLOGY: form.bioGrade.value
          ? `${form.bioGrade.value} (${form.bioBody.value})`
          : "",
        CHEMISTRY: form.chemGrade.value
          ? `${form.chemGrade.value} (${form.chemBody.value})`
          : "",
        PHYSICS: form.phyGrade.value
          ? `${form.phyGrade.value} (${form.phyBody.value})`
          : "",

        REMARKS: form.remarks.value
      };

      // ===== SAVE OR UPDATE =====
      const method = currentRowId ? "PATCH" : "POST";
      const url = currentRowId
        ? `${SHEETBEST_URL}/${currentRowId}`
        : SHEETBEST_URL;

      await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          currentRowId ? record : [record]
        )
      });

      alert(
        currentRowId
          ? "✅ Record updated successfully"
          : "✅ New record saved successfully"
      );

      location.reload();

    } catch (err) {
      alert(err);
      submitBtn.disabled = false;
      submitBtn.innerText = "SUBMIT";
    }
  });

});