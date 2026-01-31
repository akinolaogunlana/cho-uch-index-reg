document.addEventListener("DOMContentLoaded", () => {
  const $ = id => document.getElementById(id);

  const SHEETBEST_URL = "https://api.sheetbest.com/sheets/ceb9eddc-af9a-473a-9a32-f52c21c7f72b";
  const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dpsbwjw83/image/upload";
  const CLOUDINARY_PRESET = "cho_passports";

  const form = $("indexForm");
  const submitBtn = form.querySelector("button[type='submit']");
  const previewContainer = $("previewContainer");

  let passportUrl = "";
  let recordID = null;
  let isAdmin = false;

  const subjects = {
    ENGLISH: { grade: $("engGrade"), body: $("engBody") },
    MATHEMATICS: { grade: $("mathGrade"), body: $("mathBody") },
    BIOLOGY: { grade: $("bioGrade"), body: $("bioBody") },
    CHEMISTRY: { grade: $("chemGrade"), body: $("chemBody") },
    PHYSICS: { grade: $("phyGrade"), body: $("phyBody") }
  };

  const normalize = v => v?.toString().replace(/\s+/g, "").replace(/[\/\\]/g, "").toUpperCase().trim();

  /* ================= SEARCH RECORD ================= */
  $("searchBtn").addEventListener("click", async () => {
    const surname = $("searchSurname").value;
    const blood = $("searchBloodGroup").value;
    const olevel = $("searchOlevelType").value;

    if (!surname || !blood || !olevel) return alert("Surname, Blood Group and O-Level Type are required");

    try {
      const res = await fetch(SHEETBEST_URL);
      const data = await res.json();

      const record = data.find(r =>
        normalize(r.SURNAME) === normalize(surname) &&
        normalize(r.BLOOD_GROUP) === normalize(blood) &&
        normalize(r.OLEVEL_TYPE) === normalize(olevel)
      );

      if (!record) return alert("❌ Record not found");

      recordID = record.ID;
      $("recordId").value = recordID;

      // Auto-fill form fields
      for (let el of form.elements) {
        if (!el.name) continue;
        const key = el.name.toUpperCase();
        if (record[key] !== undefined) el.value = record[key];
      }

      // Subjects
      Object.keys(subjects).forEach(sub => {
        const value = record[sub] || "";
        const match = value.match(/^(.+?)\s*\((.+?)\)$/);
        subjects[sub].grade.value = match ? match[1] : value;
        subjects[sub].body.value = match ? match[2] : "";
      });

      // Passport preview
      if (record.PASSPORT) {
        passportUrl = record.PASSPORT;
        previewContainer.innerHTML = `<img src="${passportUrl}" style="width:150px;height:180px;object-fit:cover;border-radius:8px;border:2px solid #444;">`;
      }

      alert("✅ Record loaded successfully");
    } catch {
      alert("Network error");
    }
  });

  /* ================= SUBMIT / UPDATE ================= */
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!recordID) return alert("Please search and load your record first");

    submitBtn.disabled = true;
    submitBtn.innerText = "Updating...";

    try {
      const file = $("passport").files[0];
      if (file) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("upload_preset", CLOUDINARY_PRESET);
        passportUrl = (await (await fetch(CLOUDINARY_URL, { method: "POST", body: fd })).json()).secure_url;
      }

      const record = {
        ID: recordID,
        SURNAME: form.surname.value.toUpperCase(),
        FIRSTNAME: form.firstname.value.toUpperCase(),
        OTHERNAMES: form.othernames.value?.toUpperCase() || "",
        CADRE: form.cadre.value,
        GENDER: form.gender.value,
        BLOOD_GROUP: form.blood_group.value,
        STATE: form.state.value,
        LGA_CITY_TOWN: form.lga_city_town.value,
        DATE_OF_BIRTH: form.date_of_birth.value,
        OLEVEL_TYPE: form.olevel_type.value,
        OLEVEL_YEAR: form.olevel_year.value,
        OLEVEL_EXAM_NUMBER: form.olevel_exam_number.value,
        ALEVEL_TYPE: form.alevel_type.value,
        ALEVEL_YEAR: form.alevel_year.value,
        PROFESSIONAL_CERTIFICATE_NUMBER: form.professional_certificate_number.value,
        PASSPORT: passportUrl,
        REMARKS: form.remarks.value || "RETRAINEE"
      };

      Object.keys(subjects).forEach(sub => {
        const g = subjects[sub].grade.value.trim();
        const b = subjects[sub].body.value.trim();
        record[sub] = g ? `${g} (${b})` : "";
      });

      await fetch(`${SHEETBEST_URL}/ID/${recordID}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(record)
      });

      alert("✅ Record updated successfully");
      location.reload();
    } catch {
      alert("❌ Update failed");
      submitBtn.disabled = false;
      submitBtn.innerText = "SUBMIT / UPDATE";
    }
  });

  /* ================= ADMIN LOGIN ================= */
  $("adminLoginBtn").addEventListener("click", () => {
    const pass = prompt("Enter Admin Password");
    if (pass === "CHO_ADMIN_2026") {
      isAdmin = true;
      $("downloadExcelBtn").style.display = "inline-block";
      alert("✅ Admin access granted");
    } else {
      alert("❌ Wrong password");
    }
  });

  /* ================= ADMIN EXCEL DOWNLOAD ================= */
  $("downloadExcelBtn").addEventListener("click", async () => {
    if (!isAdmin) return;

    const res = await fetch(SHEETBEST_URL);
    const data = await res.json();

    // SORT alphabetically by SURNAME only
    data.sort((a, b) => ((a.SURNAME || "").toUpperCase()).localeCompare((b.SURNAME || "").toUpperCase()));

    const split = v => {
      const m = (v || "").match(/^(.+?)\s*\((.+?)\)$/);
      return m ? [m[1], m[2]] : [v || "", ""];
    };

    const sheet = [[
      "S/N","SURNAME","FIRST NAME","OTHER NAMES","CADRE","GENDER",
      "BLOOD GROUP","STATE","LGA / CITY / TOWN","DATE OF BIRTH",
      "O-LEVEL TYPE","O-LEVEL YEAR(S)","O-LEVEL EXAM NUMBER",
      "A-LEVEL TYPE","A-LEVEL YEAR",
      "PROFESSIONAL CERTIFICATE NUMBER",
      "ENGLISH GRADE","ENGLISH BODY",
      "MATHEMATICS GRADE","MATHEMATICS BODY",
      "BIOLOGY GRADE","BIOLOGY BODY",
      "CHEMISTRY GRADE","CHEMISTRY BODY",
      "PHYSICS GRADE","PHYSICS BODY",
      "REMARKS"
    ]];

    data.forEach((r, i) => {
      const [eG, eB] = split(r.ENGLISH);
      const [mG, mB] = split(r.MATHEMATICS);
      const [bG, bB] = split(r.BIOLOGY);
      const [cG, cB] = split(r.CHEMISTRY);
      const [pG, pB] = split(r.PHYSICS);

      sheet.push([
        i + 1, r.SURNAME, r.FIRSTNAME, r.OTHERNAMES, r.CADRE, r.GENDER,
        r.BLOOD_GROUP, r.STATE, r.LGA_CITY_TOWN, r.DATE_OF_BIRTH,
        r.OLEVEL_TYPE, r.OLEVEL_YEAR, r.OLEVEL_EXAM_NUMBER,
        r.ALEVEL_TYPE, r.ALEVEL_YEAR,
        r.PROFESSIONAL_CERTIFICATE_NUMBER,
        eG, eB, mG, mB, bG, bB, cG, cB, pG, pB, r.REMARKS
      ]);
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(sheet);
    XLSX.utils.book_append_sheet(wb, ws, "CHO STANDARD SHEET");
    XLSX.writeFile(wb, "CHO_STANDARD_ADMIN_SHEET.xlsx");
  });
});