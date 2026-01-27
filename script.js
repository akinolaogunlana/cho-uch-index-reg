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

  let passportDataUrl = "";
  let recordId = null;        // SheetBest internal _id
  let loadedRecord = null;    // Full record snapshot

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

    passportDataUrl = img.src;
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
    recordId = record._id; // ✅ CRITICAL FIX

    // ===== NORMAL FIELDS =====
    for (let el of form.elements) {
      if (!el.name) continue;
      const key = el.name.toUpperCase();
      if (record[key] !== undefined) el.value = record[key];
    }

    // ===== SUBJECTS =====
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
        g.value = match[1].trim();
        b.value = match[2].trim();
      } else {
        g.value = value;
        b.value = "";
      }
    });

    // ===== PASSPORT =====
    if (record.PASSPORT) {
      passportDataUrl = record.PASSPORT;
      previewContainer.innerHTML =
        `<img src="${record.PASSPORT}" style="max-width:150px;border-radius:8px">`;
    }

    alert("✅ Record loaded successfully");
  });

  // ================= SUBMIT / UPDATE =================
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!recordId || !loadedRecord) {
      alert("Please search and load a record first.");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerText = "Saving...";

    try {
      let passportUrl = loadedRecord.PASSPORT || "";

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

      // ===== SAFE MERGE (NO DATA LOSS) =====
      const record = { ...loadedRecord };

      const setIfFilled = (key, val) => {
        if (val !== undefined && val !== null && val !== "") {
          record[key] = val;
        }
      };

      setIfFilled("SURNAME", form.surname.value.toUpperCase());
      setIfFilled("FIRSTNAME", form.firstname.value.toUpperCase());
      setIfFilled("OTHERNAMES", form.othernames.value);
      setIfFilled("GENDER", form.gender.value);
      setIfFilled("BLOOD_GROUP", form.blood_group.value);
      setIfFilled("STATE", form.state.value);
      setIfFilled("LGA_CITY_TOWN", form.lga_city_town.value);
      setIfFilled("DATE_OF_BIRTH", form.date_of_birth.value);
      setIfFilled("OLEVEL_TYPE", form.olevel_type.value);
      setIfFilled("OLEVEL_YEAR", form.olevel_year.value);
      setIfFilled("OLEVEL_EXAM_NUMBER", form.olevel_exam_number.value);
      setIfFilled("ALEVEL_TYPE", form.alevel_type.value);
      setIfFilled("ALEVEL_YEAR", form.alevel_year.value);
      setIfFilled("PROFESSIONAL_CERTIFICATE_NUMBER", form.professional_certificate_number.value);
      setIfFilled("REMARKS", form.remarks.value);

      // ===== SUBJECTS SAFE UPDATE =====
      Object.keys(subjects).forEach(sub => {
        const g = subjects[sub].grade.value.trim();
        const b = subjects[sub].body.value.trim();
        if (g) record[sub] = `${g} (${b})`;
      });

      if (passportUrl) record.PASSPORT = passportUrl;

      // ===== PATCH =====
      await fetch(`${SHEETBEST_URL}/${recordId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(record)
      });

      alert("✅ Record updated successfully");
      location.reload();

    } catch (err) {
      console.error(err);
      alert("❌ Update failed");
      submitBtn.disabled = false;
      submitBtn.innerText = "SUBMIT / UPDATE";
    }
  });
});