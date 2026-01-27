document.addEventListener("DOMContentLoaded", () => {
  const $ = id => document.getElementById(id);

  // ================= CONFIG =================
  const SHEETBEST_URL =
    "https://api.sheetbest.com/sheets/ceb9eddc-af9a-473a-9a32-f52c21c7f72b";
  const CLOUDINARY_URL =
    "https://api.cloudinary.com/v1_1/dpsbwjw83/image/upload";
  const CLOUDINARY_PRESET = "cho_passports";

  const form = $("indexForm");
  const submitBtn = form.querySelector("button[type='submit']");
  const previewContainer = $("previewContainer");

  // ================= SUBJECT ELEMENTS =================
  const subjects = {
    ENGLISH: { grade: $("engGrade"), body: $("engBody") },
    MATHEMATICS: { grade: $("mathGrade"), body: $("mathBody") },
    BIOLOGY: { grade: $("bioGrade"), body: $("bioBody") },
    CHEMISTRY: { grade: $("chemGrade"), body: $("chemBody") },
    PHYSICS: { grade: $("phyGrade"), body: $("phyBody") }
  };

  let recordId = null;
  let loadedRecord = null;
  let passportUrl = null;

  // ================= PASSPORT PREVIEW =================
  $("passport").addEventListener("change", function () {
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

  // ================= SEARCH =================
  $("searchBtn").addEventListener("click", async () => {
    const surname = $("searchSurname").value.trim().toUpperCase();
    const blood = $("searchBloodGroup").value;
    const olevel = $("searchOlevelType").value;

    if (!surname || !blood || !olevel) {
      alert("Surname, blood group and O-Level type required.");
      return;
    }

    const res = await fetch(SHEETBEST_URL);
    const data = await res.json();

    const record = data.find(r =>
      r.SURNAME?.toUpperCase() === surname &&
      r.BLOOD_GROUP === blood &&
      r.OLEVEL_TYPE === olevel
    );

    if (!record) {
      alert("No record found.");
      return;
    }

    loadedRecord = record;
    recordId = record.ID;

    // ===== LOAD NORMAL FIELDS =====
    for (let el of form.elements) {
      if (!el.name) continue;
      const key = el.name.toUpperCase();
      if (record[key] !== undefined) {
        el.value = record[key];
      }
    }

    // ===== LOAD SUBJECTS =====
    Object.keys(subjects).forEach(sub => {
      const value = record[sub];
      const g = subjects[sub].grade;
      const b = subjects[sub].body;

      if (!value) {
        g.value = "";
        b.value = "";
        return;
      }

      const match = value.match(/^(.+?)\s*\((.+?)\)$/);
      if (match) {
        g.value = match[1];
        b.value = match[2];
      } else {
        g.value = value;
        b.value = "";
      }
    });

    // ===== LOAD PASSPORT =====
    if (record.PASSPORT) {
      passportUrl = record.PASSPORT;
      previewContainer.innerHTML =
        `<img src="${record.PASSPORT}" style="max-width:150px;border-radius:8px">`;
    }

    alert("✅ Record loaded successfully");
  });

  // ================= SUBMIT / UPDATE =================
  form.addEventListener("submit", async e => {
    e.preventDefault();

    if (!recordId || !loadedRecord) {
      alert("Please search and load a record first.");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerText = "Saving...";

    try {
      // ===== PASSPORT UPLOAD =====
      const file = $("passport").files[0];
      if (file) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("upload_preset", CLOUDINARY_PRESET);

        const upload = await fetch(CLOUDINARY_URL, {
          method: "POST",
          body: fd
        });

        const img = await upload.json();
        if (img?.secure_url) passportUrl = img.secure_url;
      }

      // ===== SAFE MERGE =====
      const record = { ...loadedRecord };

      const updateIfFilled = (field, key, transform = v => v) => {
        if (field && field.value.trim() !== "") {
          record[key] = transform(field.value.trim());
        }
      };

      updateIfFilled(form.surname, "SURNAME", v => v.toUpperCase());
      updateIfFilled(form.firstname, "FIRSTNAME", v => v.toUpperCase());
      updateIfFilled(form.othernames, "OTHERNAMES");
      updateIfFilled(form.gender, "GENDER");
      updateIfFilled(form.blood_group, "BLOOD_GROUP");
      updateIfFilled(form.state, "STATE");
      updateIfFilled(form.lga_city_town, "LGA_CITY_TOWN");
      updateIfFilled(form.date_of_birth, "DATE_OF_BIRTH");
      updateIfFilled(form.olevel_type, "OLEVEL_TYPE");
      updateIfFilled(form.olevel_year, "OLEVEL_YEAR");
      updateIfFilled(form.olevel_exam_number, "OLEVEL_EXAM_NUMBER");
      updateIfFilled(form.alevel_type, "ALEVEL_TYPE");
      updateIfFilled(form.alevel_year, "ALEVEL_YEAR");
      updateIfFilled(
        form.professional_certificate_number,
        "PROFESSIONAL_CERTIFICATE_NUMBER"
      );
      updateIfFilled(form.remarks, "REMARKS");

      // ===== SUBJECTS =====
      Object.keys(subjects).forEach(sub => {
        const g = subjects[sub].grade?.value.trim();
        const b = subjects[sub].body?.value.trim();
        if (g) {
          record[sub] = b ? `${g} (${b})` : g;
        }
      });

      if (passportUrl) {
        record.PASSPORT = passportUrl;
      }

      console.log("PATCH DATA:", record);

      await fetch(`${SHEETBEST_URL}/${recordId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(record)
      });

      alert("✅ Record updated successfully");
      location.reload();

    } catch (err) {
      console.error(err);
      alert("ERROR: " + err.message);
      submitBtn.disabled = false;
      submitBtn.innerText = "SUBMIT / UPDATE";
    }
  });
});