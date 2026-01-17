const SHEETBEST_URL = "https://api.sheetbest.com/sheets/c610f771-67a2-4120-b4fa-c2d102aee546";
const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/444391351669479/upload";
const CLOUDINARY_PRESET = "zZVWX8x_CQogXAd0B7GIIcXaK_0";

const form = document.getElementById("indexForm");

form.addEventListener("submit", async function(e) {
  e.preventDefault();

  const submitBtn = form.querySelector("button");
  submitBtn.disabled = true;
  submitBtn.innerText = "Submitting...";

  try {
    // ========== PASSPORT UPLOAD ==========
    const passportFile = document.getElementById("passport").files[0];
    if (!passportFile) throw "Passport required";

    const cloudForm = new FormData();
    cloudForm.append("file", passportFile);
    cloudForm.append("upload_preset", CLOUDINARY_PRESET);

    const cloudRes = await fetch(CLOUDINARY_URL, {
      method: "POST",
      body: cloudForm
    });

    if (!cloudRes.ok) throw "Passport upload failed";

    const cloudData = await cloudRes.json();
    const passportUrl = cloudData.secure_url;

    // ========== SUBJECT GRADES ==========
    const gradeMap = {
      ENGLISH: ["engGrade","engBody"],
      MATHEMATICS: ["mathGrade","mathBody"],
      BIOLOGY: ["bioGrade","bioBody"],
      CHEMISTRY: ["chemGrade","chemBody"],
      PHYSICS: ["phyGrade","phyBody"]
    };

    const data = {};

    Object.keys(gradeMap).forEach(subject => {
      const [gradeId, bodyId] = gradeMap[subject];
      const grade = document.getElementById(gradeId).value || "";
      const body = document.getElementById(bodyId).value || "";
      data[subject] = grade ? `${grade} (${body})` : "";
    });

    // ========== PERSONAL DATA ==========
    data["SURNAME"] = form.surname.value.trim().toUpperCase();
    data["FIRSTNAME"] = form.firstname.value.trim().toUpperCase();
    data["OTHERNAMES"] = form.othernames.value.trim().toUpperCase();
    data["PASSPORT"] = passportUrl;
    data["CADRE"] = form.cadre.value;
    data["GENDER"] = form.gender.value;
    data["BLOOD_GROUP"] = form.bloodgroup.value;
    data["STATE"] = form.state.value;
    data["LGA_CITY_TOWN"] = form.lga.value;
    data["DATE_OF_BIRTH"] = form.dob.value;

    data["OLEVEL_TYPE"] = form.olevel_type.value;
    data["OLEVEL_YEAR"] = form.olevel_year.value;
    data["OLEVEL_EXAM_NUMBER"] = form.olevel_exam.value;

    data["ALEVEL_TYPE"] = form.alevel_type.value;
    data["ALEVEL_YEAR"] = form.alevel_year.value;
    data["PROFESSIONAL_CERTIFICATE_NUMBER"] = form.pro_cert.value;

    data["REMARKS"] = form.remarks.value;

    // ========== SEND TO SHEETBEST ==========
    const res = await fetch(SHEETBEST_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    if (!res.ok) throw "SheetBest submission failed";

    // ========== SUCCESS ==========
    window.location.href = "success.html";

  } catch (error) {
    console.error(error);
    alert("Submission failed. Please try again.");
    submitBtn.disabled = false;
    submitBtn.innerText = "SUBMIT";
  }
});