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
      document.getElementById("searchWarning").innerText =
        "Surname, blood group and O-Level type required.";
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

    // ===== NORMAL FIELDS =====
    for (let el of form.elements) {
      const key = el.name?.toUpperCase();
      if (key && record[key] !== undefined) {
        el.value = record[key];
      }
    }

    // ===== SUBJECT FIX =====
    function splitSubject(value) {
      if (!value) return ["", ""];
      const match = value.match(/^(.+?)\s*\((.+?)\)$/);
      return match ? [match[1], match[2]] : [value, ""];
    }

    let [g, b] = splitSubject(record.ENGLISH);
    engGrade.value = g;
    engBody.value = b;

    [g, b] = splitSubject(record.MATHEMATICS);
    mathGrade.value = g;
    mathBody.value = b;

    [g, b] = splitSubject(record.BIOLOGY);
    bioGrade.value = g;
    bioBody.value = b;

    [g, b] = splitSubject(record.CHEMISTRY);
    chemGrade.value = g;
    chemBody.value = b;

    [g, b] = splitSubject(record.PHYSICS);
    phyGrade.value = g;
    phyBody.value = b;

    // ===== PASSPORT =====
    if (record.PASSPORT) {
      passportDataUrl = record.PASSPORT;
      previewContainer.innerHTML =
        `<img src="${record.PASSPORT}" style="max-width:150px;border-radius:8px">`;
    }

    alert("✅ Record loaded correctly");
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

        ENGLISH: `${engGrade.value} (${engBody.value})`,
        MATHEMATICS: `${mathGrade.value} (${mathBody.value})`,
        BIOLOGY: bioGrade.value ? `${bioGrade.value} (${bioBody.value})` : "",
        CHEMISTRY: chemGrade.value ? `${chemGrade.value} (${chemBody.value})` : "",
        PHYSICS: phyGrade.value ? `${phyGrade.value} (${phyBody.value})` : "",

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
      alert("Error: " + err);
      submitBtn.disabled = false;
      submitBtn.innerText = "SUBMIT";
    }
  });

});