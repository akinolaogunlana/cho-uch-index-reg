document.addEventListener("DOMContentLoaded", function () {
  const SHEETBEST_URL = "https://api.sheetbest.com/sheets/c610f771-67a2-4120-b4fa-c2d102aee546";
  const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dpsbwjw83/image/upload";
  const CLOUDINARY_PRESET = "cho_passports";

  const form = document.getElementById("indexForm");
  const submitBtn = form.querySelector("button");

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    submitBtn.disabled = true;
    submitBtn.innerText = "Uploading passport...";

    try {
      const file = document.getElementById("passport").files[0];
      if (!file) throw "Passport photo is required.";
      if (file.size > 5 * 1024 * 1024) throw "Image too large (max 5MB).";

      // Upload to Cloudinary
      const cloudForm = new FormData();
      cloudForm.append("file", file);
      cloudForm.append("upload_preset", CLOUDINARY_PRESET);

      const cloudRes = await fetch(CLOUDINARY_URL, { method: "POST", body: cloudForm });
      if (!cloudRes.ok) throw "Cloudinary upload failed.";
      const cloudData = await cloudRes.json();
      if (!cloudData.secure_url) throw "Invalid Cloudinary response.";

      submitBtn.innerText = "Saving data...";

      // Prepare SheetBest data
      const data = [{
        "SURNAME": form.surname.value.trim().toUpperCase(),
        "FIRSTNAME": form.firstname.value.trim().toUpperCase(),
        "OTHERNAMES": form.othernames.value.trim().toUpperCase(),
        "PASSPORT": cloudData.secure_url,
        "CADRE": form.cadre.value,
        "GENDER": form.gender.value,
        "BLOOD_GROUP": form.bloodgroup.value,
        "STATE": form.state.value,
        "LGA": form.lga.value,
        "DATE_OF_BIRTH": form.dob.value,
        "OLEVEL_TYPE": form.olevel_type.value,
        "OLEVEL_YEAR": form.olevel_year.value,
        "OLEVEL_EXAM_NUMBER": form.olevel_exam.value,
        "ALEVEL_TYPE": form.alevel_type.value,
        "ALEVEL_YEAR": form.alevel_year.value,
        "PROFESSIONAL_CERTIFICATE_NUMBER": form.pro_cert.value,
        "ENGLISH": `${document.getElementById("engGrade").value} (${document.getElementById("engBody").value})`,
        "MATHEMATICS": `${document.getElementById("mathGrade").value} (${document.getElementById("mathBody").value})`,
        "BIOLOGY": document.getElementById("bioGrade").value ? `${document.getElementById("bioGrade").value} (${document.getElementById("bioBody").value})` : "",
        "CHEMISTRY": document.getElementById("chemGrade").value ? `${document.getElementById("chemGrade").value} (${document.getElementById("chemBody").value})` : "",
        "PHYSICS": document.getElementById("phyGrade").value ? `${document.getElementById("phyGrade").value} (${document.getElementById("phyBody").value})` : "",
        "REMARKS": form.remarks.value
      }];

      // Send to SheetBest
      const sheetRes = await fetch(SHEETBEST_URL, {
        method: "POST",
        mode: "cors",
        body: JSON.stringify(data) // must be an array
      });

      if (!sheetRes.ok) throw "Sheet save failed. Check sheet headers.";

      // Success screen
      form.innerHTML = `
        <div style="text-align:center;padding:40px">
          <h2 style="color:green">✅ Submission Successful</h2>
          <p>Your information has been saved successfully.</p>
          <button onclick="location.reload()">Submit Another</button>
        </div>
      `;

    } catch (error) {
      alert(error);
      console.error(error);
      submitBtn.disabled = false;
      submitBtn.innerText = "SUBMIT";
    }
  });
});