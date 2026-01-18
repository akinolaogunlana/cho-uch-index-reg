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

      // 1️⃣ Upload to Cloudinary
      const cloudForm = new FormData();
      cloudForm.append("file", file);
      cloudForm.append("upload_preset", CLOUDINARY_PRESET);

      const cloudRes = await fetch(CLOUDINARY_URL, { method: "POST", body: cloudForm });
      if (!cloudRes.ok) throw "Cloudinary upload failed.";
      const cloudData = await cloudRes.json();
      if (!cloudData.secure_url) throw "Invalid Cloudinary response.";

      submitBtn.innerText = "Saving data...";

      // 2️⃣ Prepare SheetBest data with exact headers
      const data = [{
        "SURNAME": form.surname.value.trim().toUpperCase(),
        "FIRSTNAME": form.firstname.value.trim().toUpperCase(),
        "OTHERNAMES": form.othernames.value.trim().toUpperCase(),
        "PASSPORT": cloudData.secure_url,
        "CADRE": form.cadre.value,
        "GENDER": form.gender.value,
        "BLOOD GROUP": form.bloodgroup.value,
        "STATE": form.state.value,
        "LGA / CITY/TOWN": form.lga.value,
        "DATE OF BIRTH": form.dob.value,
        "OLEVEL TYPE": form.olevel_type.value,
        "OLEVEL YEAR": form.olevel_year.value,
        "OLEVEL EXAM NUMBER": form.olevel_exam.value,
        "ALEVEL TYPE": form.alevel_type.value,
        "ALEVEL YEAR": form.alevel_year.value,
        "PROFESSIONAL CERTIFICATE NUMBER": form.pro_cert.value,
        "ENGLISH": `${engGrade.value} (${engBody.value})`,
        "MATHEMATICS": `${mathGrade.value} (${mathBody.value})`,
        "BIOLOGY / HEALTH SCIENCE": bioGrade.value ? `${bioGrade.value} (${bioBody.value})` : "",
        "CHEMISTRY": chemGrade.value ? `${chemGrade.value} (${chemBody.value})` : "",
        "PHYSICS": phyGrade.value ? `${phyGrade.value} (${phyBody.value})` : "",
        "REMARKS": form.remarks.value
      }];

      // 3️⃣ Send to SheetBest
      const sheetRes = await fetch(SHEETBEST_URL, {
        method: "POST",
        mode: "cors",
        body: JSON.stringify(data) // must be an array
      });

      if (!sheetRes.ok) throw "SheetBest rejected the data.";

      // 4️⃣ Success screen
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