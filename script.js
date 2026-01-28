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
  const recordIdHolder = $("recordIdHolder");

  // ================= BLOCK ENTER SUBMIT =================
  form.addEventListener("keydown", e => {
    if (e.key === "Enter") e.preventDefault();
  });

  // ================= SUBJECT ELEMENTS =================
  const subjects = {
    ENGLISH: { grade: $("engGrade"), body: $("engBody") },
    MATHEMATICS: { grade: $("mathGrade"), body: $("mathBody") },
    BIOLOGY: { grade: $("bioGrade"), body: $("bioBody") },
    CHEMISTRY: { grade: $("chemGrade"), body: $("chemBody") },
    PHYSICS: { grade: $("phyGrade"), body: $("phyBody") }
  };

  let loadedRecord = null;

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
    recordIdHolder.value = record._id; // ✅ PERSIST ID

    // ===== FILL FORM =====
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

      if (!value) return;

      const match = value.match(/^(.+?)\s*\((.+?)\)$/);
      if (match) {
        g.value = match[1].trim();
        b.value = match[2].trim();
      }
    });

    if (record.PASSPORT) {
      previewContainer.innerHTML =
        `<img src="${record.PASSPORT}" style="max-width:150px;border-radius:8px">`;
    }

    alert("✅ Record loaded. You can now edit.");
  });

  // ================= SUBMIT =================
  form.addEventListener("submit", async e => {
    e.preventDefault();

    const recordId = recordIdHolder.value;
    if (!recordId || !loadedRecord) {
      alert("Please search and load a record first.");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerText = "Saving...";

    try {
      const record = { ...loadedRecord };

      const set = (k, v) => v && (record[k] = v);

      set("SURNAME", form.surname.value.toUpperCase());
      set("FIRSTNAME", form.firstname.value.toUpperCase());
      set("OTHERNAMES", form.othernames.value);
      set("GENDER", form.gender.value);
      set("BLOOD_GROUP", form.blood_group.value);
      set("STATE", form.state.value);
      set("LGA_CITY_TOWN", form.lga_city_town.value);
      set("DATE_OF_BIRTH", form.date_of_birth.value);
      set("OLEVEL_TYPE", form.olevel_type.value);
      set("OLEVEL_YEAR", form.olevel_year.value);
      set("OLEVEL_EXAM_NUMBER", form.olevel_exam_number.value);
      set("ALEVEL_TYPE", form.alevel_type.value);
      set("ALEVEL_YEAR", form.alevel_year.value);
      set("PROFESSIONAL_CERTIFICATE_NUMBER", form.professional_certificate_number.value);
      set("REMARKS", form.remarks.value);

      Object.keys(subjects).forEach(sub => {
        const g = subjects[sub].grade.value.trim();
        const b = subjects[sub].body.value.trim();
        if (g) record[sub] = `${g} (${b})`;
      });

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
// ================= ADMIN EDIT LOAD =================
const editID = localStorage.getItem("editID");

if (editID) {
  fetch(`${SHEETBEST_URL}/${editID}`)
    .then(res => res.json())
    .then(record => {

      document.getElementById("recordId").value = record.ID;

      for (let el of form.elements) {
        if (!el.name) continue;
        const key = el.name.toUpperCase();
        if (record[key] !== undefined) {
          el.value = record[key];
        }
      }

      // subjects
      const map = {
        ENGLISH: ["engGrade", "engBody"],
        MATHEMATICS: ["mathGrade", "mathBody"],
        BIOLOGY: ["bioGrade", "bioBody"],
        CHEMISTRY: ["chemGrade", "chemBody"],
        PHYSICS: ["phyGrade", "phyBody"]
      };

      for (let s in map) {
        if (!record[s]) continue;
        const [g, b] = record[s].split("(");
        document.getElementById(map[s][0]).value = g.trim();
        document.getElementById(map[s][1]).value =
          record[s].match(/\((.*?)\)/)?.[1] || "";
      }

      localStorage.removeItem("editID");
      alert("Admin editing record loaded");
    });
}