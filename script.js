document.addEventListener("DOMContentLoaded", () => {

  const SHEETBEST_URL =
    "https://api.sheetbest.com/sheets/ceb9eddc-af9a-473a-9a32-f52c21c7f72b";

  const CLOUDINARY_URL =
    "https://api.cloudinary.com/v1_1/dpsbwjw83/image/upload";

  const CLOUDINARY_PRESET = "cho_passports";

  const form = document.getElementById("indexForm");
  const submitBtn = form.querySelector("button[type='submit']");
  const previewContainer = document.getElementById("previewContainer");

  let passportDataUrl = "";
  let recordId = null;

  /* ================= PASSPORT PREVIEW ================= */
  document.getElementById("passport").addEventListener("change", function () {
    const file = this.files[0];
    if (!file) return;

    if (!["image/jpeg", "image/png"].includes(file.type)) {
      alert("Only JPG or PNG allowed");
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

  /* ================= SEARCH ================= */
  document.getElementById("searchBtn").addEventListener("click", async () => {

    const surname =
      document.getElementById("searchSurname").value.trim().toUpperCase();

    const blood =
      document.getElementById("searchBloodGroup").value;

    const olevel =
      document.getElementById("searchOlevelType").value;

    if (!surname || !blood || !olevel) {
      alert("Surname, blood group and O-Level type required");
      return;
    }

    const res = await fetch(SHEETBEST_URL);
    const data = await res.json();

    const record = data.find(r =>
      r.SURNAME === surname &&
      r.BLOOD_GROUP === blood &&
      r.OLEVEL_TYPE === olevel
    );

    if (!record) {
      alert("No record found");
      return;
    }

    recordId = record._id;

    /* ===== NORMAL FIELDS ONLY ===== */
    for (let el of form.elements) {

      if (!el.name) continue;

      const key = el.name.toUpperCase();

      // 🚫 DO NOT autofill subject fields
      if (
        key === "ENGLISH" ||
        key === "MATHEMATICS" ||
        key === "BIOLOGY" ||
        key === "CHEMISTRY" ||
        key === "PHYSICS"
      ) continue;

      if (record[key] !== undefined) {
        el.value = record[key];
      }
    }

    /* ===== SUBJECT PARSER ===== */
    function loadSubject(value, gradeEl, bodyEl) {

      if (!value) {
        gradeEl.value = "";
        bodyEl.value = "";
        return;
      }

      const match = value.match(/^(.+?)\s*\((.+?)\)$/);

      if (match) {
        gradeEl.value = match[1].trim();
        bodyEl.value = match[2].trim();
      } else {
        gradeEl.value = value;
        bodyEl.value = "";
      }
    }

    loadSubject(record.ENGLISH, engGrade, engBody);
    loadSubject(record.MATHEMATICS, mathGrade, mathBody);
    loadSubject(record.BIOLOGY, bioGrade, bioBody);
    loadSubject(record.CHEMISTRY, chemGrade, chemBody);
    loadSubject(record.PHYSICS, phyGrade, phyBody);

    /* ===== PASSPORT ===== */
    if (record.PASSPORT) {
      passportDataUrl = record.PASSPORT;
      previewContainer.innerHTML =
        `<img src="${record.PASSPORT}" style="max-width:150px;border-radius:8px">`;
    }

    alert("✅ Record loaded cleanly");
  });

  /* ================= SUBMIT ================= */
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    submitBtn.disabled = true;
    submitBtn.innerText = "Saving...";

    try {

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

        const img = await upload.json();
        passportUrl = img.secure_url;
      }

      // 🔥 CLEAN SUBJECT VALUES BEFORE SAVING
      const clean = (g, b) =>
        g ? `${g.replace(/\(.+\)/g, "").trim()} (${b})` : "";

      const record = {
        SURNAME: form.surname.value.toUpperCase(),
        FIRSTNAME: form.firstname.value.toUpperCase(),
        OTHERNAMES: form.othernames.value.toUpperCase(),
        CADRE: "CHO",
        GENDER: form.gender.value,
        BLOOD_GROUP: form.bloodgroup.value,
        STATE: form.state.value,
        LGA_CITY_TOWN: form.lga_city_town.value,
        DATE_OF_BIRTH: form.dob.value,
        OLEVEL_TYPE: form.olevel_type.value,
        OLEVEL_YEAR: form.olevel_year.value,
        OLEVEL_EXAM_NUMBER: form.olevel_exam.value,
        PASSPORT: passportUrl,

        ENGLISH: clean(engGrade.value, engBody.value),
        MATHEMATICS: clean(mathGrade.value, mathBody.value),
        BIOLOGY: clean(bioGrade.value, bioBody.value),
        CHEMISTRY: clean(chemGrade.value, chemBody.value),
        PHYSICS: clean(phyGrade.value, phyBody.value),

        REMARKS: form.remarks.value
      };

      const url = recordId
        ? `${SHEETBEST_URL}/${recordId}`
        : SHEETBEST_URL;

      const method = recordId ? "PUT" : "POST";

      await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(recordId ? record : [record])
      });

      alert(recordId
        ? "✅ Record updated successfully"
        : "✅ Record saved successfully");

      location.reload();

    } catch (err) {
      alert(err);
      submitBtn.disabled = false;
      submitBtn.innerText = "SUBMIT";
    }
  });

});