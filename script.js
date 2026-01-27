document.addEventListener("DOMContentLoaded", () => {

  /* ================= CONFIG ================= */
  const SHEETBEST_URL = "https://api.sheetbest.com/sheets/ceb9eddc-af9a-473a-9a32-f52c21c7f72b";
  const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dpsbwjw83/image/upload";
  const CLOUDINARY_PRESET = "cho_passports";
  const ADMIN_PASSWORD = "CHO@2026Secure!";

  /* ================= ELEMENTS ================= */
  const form = document.getElementById("indexForm");
  const passportInput = document.getElementById("passport");
  const previewContainer = document.getElementById("previewContainer");
  const downloadPDFBtn = document.getElementById("downloadPDFBtn");
  const retrieveBtn = document.getElementById("retrieveBtn");
  const adminLoginBtn = document.getElementById("adminLoginBtn");
  const downloadZipBtn = document.getElementById("downloadZipBtn");
  const submitBtn = document.getElementById("submitBtn");

  /* ================= STATE ================= */
  let currentRowNumber = null;
  let currentPassportUrl = "";
  let passportDataUrl = "";

  /* ================= PASSPORT PREVIEW ================= */
  passportInput.addEventListener("change", () => {
    previewContainer.innerHTML = "";
    const file = passportInput.files[0];
    if (!file) return;

    if (!["image/jpeg","image/png"].includes(file.type)) {
      alert("Only JPG or PNG allowed");
      passportInput.value = "";
      return;
    }

    if (file.size > 5*1024*1024) {
      alert("Max image size is 5MB");
      passportInput.value = "";
      return;
    }

    const img = document.createElement("img");
    img.style.maxWidth = "150px";
    img.style.borderRadius = "8px";
    img.src = URL.createObjectURL(file);

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext("2d").drawImage(img,0,0);
      passportDataUrl = canvas.toDataURL("image/jpeg");
    };

    previewContainer.appendChild(img);
  });

  /* ================= RETRIEVE FUNCTION ================= */
  retrieveBtn.addEventListener("click", async () => {
    retrieveBtn.disabled = true;
    retrieveBtn.textContent = "Retrieving...";

    const firstname = form.firstname.value.trim().toUpperCase();
    const bloodgroup = form.bloodgroup.value.trim().toUpperCase();
    const olevelType = form.olevel_type.value.trim().toUpperCase();

    if (!firstname || !bloodgroup || !olevelType) {
      alert("Enter FIRST NAME, BLOOD GROUP and O-LEVEL TYPE");
      retrieveBtn.disabled = false;
      retrieveBtn.textContent = "Retrieve & Edit My Record";
      return;
    }

    try {
      const res = await fetch(SHEETBEST_URL);
      if (!res.ok) throw new Error("Failed to fetch records");

      let rows = await res.json();

      // Auto sort alphabetically by SURNAME
      rows.sort((a,b) => (a["SURNAME"]||"").localeCompare(b["SURNAME"]||""));

      const record = rows.find(r => 
        r["FIRSTNAME"]?.toUpperCase() === firstname &&
        r["BLOOD GROUP"]?.toUpperCase() === bloodgroup &&
        r["O LEVEL TYPE"]?.toUpperCase() === olevelType
      );

      if (!record) {
        alert("No matching record found.");
        return;
      }

      populateForm(record);
      currentRowNumber = record._rowNumber || null;
      currentPassportUrl = record["PASSPORT"] || "";
      downloadPDFBtn.style.display = "inline-block";

      alert("✅ Record retrieved successfully. You can now edit and resubmit.");

    } catch(err) {
      console.error(err);
      alert("Error retrieving record. Check your internet or sheet setup.");
    } finally {
      retrieveBtn.disabled = false;
      retrieveBtn.textContent = "Retrieve & Edit My Record";
    }
  });

  /* ================= POPULATE FORM ================= */
  function populateForm(r) {
    form.surname.value = r["SURNAME"] || "";
    form.firstname.value = r["FIRSTNAME"] || "";
    form.othernames.value = r["OTHERNAMES"] || "";
    form.gender.value = r["GENDER"] || "";
    form.cadre.value = r["CADRE"] || "";
    form.state.value = r["STATE"] || "";
    form.lga_city_town.value = r["LGA/CITY/TOWN"] || "";
    form.dob.value = r["DOB"] || "";
    form.bloodgroup.value = r["BLOOD GROUP"] || "";
    form.olevel_type.value = r["O LEVEL TYPE"] || "";
    form.olevel_year.value = r["O LEVEL YEAR"] || "";
    form.olevel_exam.value = r["O LEVEL EXAM"] || "";
    form.alevel_type.value = r["A LEVEL TYPE"] || "";
    form.alevel_year.value = r["A LEVEL YEAR"] || "";
    form.remarks.value = r["REMARKS"] || "";

    // Subject grades
    form.eng_grade.value = r["ENGLISH_GRADE"] || "";
    form.eng_body.value = r["ENGLISH_BODY"] || "WAEC";
    form.math_grade.value = r["MATHEMATICS_GRADE"] || "";
    form.math_body.value = r["MATHEMATICS_BODY"] || "WAEC";
    form.bio_grade.value = r["BIOLOGY_GRADE"] || "";
    form.bio_body.value = r["BIOLOGY_BODY"] || "WAEC";
    form.chem_grade.value = r["CHEMISTRY_GRADE"] || "";
    form.chem_body.value = r["CHEMISTRY_BODY"] || "WAEC";
    form.phy_grade.value = r["PHYSICS_GRADE"] || "";
    form.phy_body.value = r["PHYSICS_BODY"] || "WAEC";

    if (r["PASSPORT"]) {
      previewContainer.innerHTML = `<img src="${r["PASSPORT"]}" style="max-width:150px;border-radius:8px">`;
      passportDataUrl = r["PASSPORT"];
    }
  }

  /* ================= FORM SUBMISSION ================= */
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    submitBtn.disabled = true;
    submitBtn.textContent = currentRowNumber ? "Updating..." : "Submitting...";

    try {
      let passportUrl = currentPassportUrl;

      if (passportInput.files.length) {
        const fd = new FormData();
        fd.append("file", passportInput.files[0]);
        fd.append("upload_preset", CLOUDINARY_PRESET);

        const uploadRes = await fetch(CLOUDINARY_URL, { method:"POST", body: fd });
        const uploadData = await uploadRes.json();
        if(!uploadData.secure_url) throw "Passport upload failed";
        passportUrl = uploadData.secure_url;
      }

      const payload = {
        "SURNAME": form.surname.value.trim().toUpperCase(),
        "FIRSTNAME": form.firstname.value.trim().toUpperCase(),
        "OTHERNAMES": form.othernames.value.trim().toUpperCase(),
        "CADRE": form.cadre.value,
        "GENDER": form.gender.value,
        "STATE": form.state.value,
        "LGA/CITY/TOWN": form.lga_city_town.value,
        "DOB": form.dob.value,
        "BLOOD GROUP": form.bloodgroup.value,
        "O LEVEL TYPE": form.olevel_type.value,
        "O LEVEL YEAR": form.olevel_year.value,
        "O LEVEL EXAM": form.olevel_exam.value,
        "A LEVEL TYPE": form.alevel_type.value,
        "A LEVEL YEAR": form.alevel_year.value,
        "REMARKS": form.remarks.value,
        "PASSPORT": passportUrl,
        "ENGLISH_GRADE": form.eng_grade.value,
        "ENGLISH_BODY": form.eng_body.value,
        "MATHEMATICS_GRADE": form.math_grade.value,
        "MATHEMATICS_BODY": form.math_body.value,
        "BIOLOGY_GRADE": form.bio_grade.value,
        "BIOLOGY_BODY": form.bio_body.value,
        "CHEMISTRY_GRADE": form.chem_grade.value,
        "CHEMISTRY_BODY": form.chem_body.value,
        "PHYSICS_GRADE": form.phy_grade.value,
        "PHYSICS_BODY": form.phy_body.value
      };

      if(currentRowNumber){
        // UPDATE
        await fetch(`${SHEETBEST_URL}/_rowNumber/${currentRowNumber}`, {
          method:"PATCH",
          headers: {"Content-Type":"application/json"},
          body: JSON.stringify(payload)
        });
      } else {
        // NEW
        await fetch(SHEETBEST_URL,{
          method:"POST",
          headers: {"Content-Type":"application/json"},
          body: JSON.stringify([payload])
        });
      }

      alert("✅ Saved successfully");
      downloadPDF();

    } catch(err){
      console.error(err);
      alert("Submission failed");
    } finally{
      submitBtn.disabled = false;
      submitBtn.textContent = "✅ SAVE / UPDATE MY INFORMATION";
    }
  });

  /* ================= PDF GENERATION ================= */
  function downloadPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    let y = 20;
    doc.setFontSize(16);
    doc.text("CHO INDEXING SLIP", 105, y, {align:"center"});
    y += 15;

    if(passportDataUrl){
      doc.addImage(passportDataUrl,"JPEG",80,y,50,50);
      y += 60;
    }

    doc.setFontSize(11);
    const fields = [
      ["SURNAME", form.surname.value],
      ["FIRST NAME", form.firstname.value],
      ["OTHER NAMES", form.othernames.value],
      ["GENDER", form.gender.value],
      ["BLOOD GROUP", form.bloodgroup.value],
      ["DOB", form.dob.value],
      ["O LEVEL TYPE", form.olevel_type.value],
      ["O LEVEL YEAR", form.olevel_year.value],
      ["O LEVEL EXAM", form.olevel_exam.value],
      ["A LEVEL TYPE", form.alevel_type.value],
      ["A LEVEL YEAR", form.alevel_year.value],
      ["ENGLISH", `${form.eng_grade.value} (${form.eng_body.value})`],
      ["MATHEMATICS", `${form.math_grade.value} (${form.math_body.value})`],
      ["BIOLOGY", `${form.bio_grade.value} (${form.bio_body.value})`],
      ["CHEMISTRY", `${form.chem_grade.value} (${form.chem_body.value})`],
      ["PHYSICS", `${form.phy_grade.value} (${form.phy_body.value})`],
      ["REMARKS", form.remarks.value]
    ];

    fields.forEach(([k,v])=>{
      doc.text(`${k}: ${v}`,20,y);
      y+=8;
      if(y>280) doc.addPage(), y=20;
    });

    doc.save(`CHO_SLIP_${form.firstname.value}.pdf`);
  }

  downloadPDFBtn.addEventListener("click", downloadPDF);

  /* ================= ADMIN LOGIN & ZIP ================= */
  adminLoginBtn.addEventListener("click",()=>{
    const pass = prompt("🔒 Admin Password:");
    if(pass!==ADMIN_PASSWORD){alert("❌ Access Denied");return;}
    alert("✅ Admin access granted");
    downloadZipBtn.classList.remove("hidden");
    adminLoginBtn.classList.add("hidden");
  });

  downloadZipBtn.addEventListener("click", async ()=>{
    downloadZipBtn.disabled = true;
    downloadZipBtn.textContent = "Preparing ZIP...";

    try{
      const res = await fetch(SHEETBEST_URL);
      if(!res.ok) throw "Failed to fetch data";
      let rows = await res.json();

      // Sort alphabetically by surname
      rows.sort((a,b) => (a["SURNAME"]||"").localeCompare(b["SURNAME"]||""));

      const zip = new JSZip();
      const folder = zip.folder("passports");

      for(let i=0;i<rows.length;i++){
        const r = rows[i];
        if(r["PASSPORT"]){
          const imgRes = await fetch(r["PASSPORT"]);
          const blob = await imgRes.blob();
          folder.file(`${r["SURNAME"]}_${r["FIRSTNAME"]}_${i+1}.jpg`, blob);
        }
      }

      const content = await zip.generateAsync({type:"blob"});
      const a = document.createElement("a");
      a.href = URL.createObjectURL(content);
      a.download = "CHO_Passports.zip";
      a.click();

    }catch(err){
      console.error(err);
      alert("Failed to prepare ZIP");
    }finally{
      downloadZipBtn.disabled = false;
      downloadZipBtn.textContent = "📦 DOWNLOAD ALL PASSPORTS (ZIP)";
    }
  });

  /* ================= LIVE DUPLICATE CHECK ================= */
  const firstnameInput = form.firstname;
  const bloodgroupInput = form.bloodgroup;
  const olevelInput = form.olevel_type;
  let duplicateWarning = null;

  async function validateDuplicate(){
    const f = firstnameInput.value.trim().toUpperCase();
    const b = bloodgroupInput.value.trim().toUpperCase();
    const o = olevelInput.value.trim().toUpperCase();

    if(!f || !b || !o){
      if(duplicateWarning) duplicateWarning.textContent="";
      submitBtn.disabled = false;
      return;
    }

    try{
      const res = await fetch(SHEETBEST_URL);
      if(!res.ok) throw "Failed to fetch for duplicate check";
      const rows = await res.json();
      const duplicate = rows.find(r=> r["FIRSTNAME"]?.toUpperCase()===f && r["BLOOD GROUP"]?.toUpperCase()===b && r["O LEVEL TYPE"]?.toUpperCase()===o);
      if(duplicate){
        if(!duplicateWarning){
          duplicateWarning = document.createElement("div");
          duplicateWarning.style.color="red";
          duplicateWarning.style.marginTop="5px";
          submitBtn.parentNode.insertBefore(duplicateWarning,submitBtn);
        }
        duplicateWarning.textContent = "❌ Duplicate entry detected!";
        submitBtn.disabled = true;
      }else{
        if(duplicateWarning) duplicateWarning.textContent="";
        submitBtn.disabled = false;
      }
    }catch(err){
      console.error(err);
    }
  }

  firstnameInput.addEventListener("input",validateDuplicate);
  bloodgroupInput.addEventListener("input",validateDuplicate);
  olevelInput.addEventListener("input",validateDuplicate);

});