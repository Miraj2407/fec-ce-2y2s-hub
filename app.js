(() => {
  const data = window.DRIVE_DATA;
  if (!data) return;

  const driveFolderUrl = (id) => `https://drive.google.com/drive/folders/${id}`;
  const driveFileUrl = (id) => `https://drive.google.com/file/d/${id}/view`;

  const getExt = (name) => {
    const parts = name.split(".");
    if (parts.length < 2) return "FILE";
    const ext = parts.pop().trim().toLowerCase();
    return ext.length <= 5 ? ext : "FILE";
  };

  const countSectionFiles = (sec) => {
    let n = sec.files.length;
    for (const sub of sec.subfolders) {
      n += sub.files.length;
      for (const ss of sub.subfolders || []) {
        n += ss.files.length;
      }
    }
    return n;
  };

  // Theme toggle
  const rootEl = document.documentElement;
  const savedTheme = localStorage.getItem("fec-theme");
  if (savedTheme === "dark") rootEl.setAttribute("data-theme", "dark");
  document.getElementById("themeToggle").addEventListener("click", () => {
    const isDark = rootEl.getAttribute("data-theme") === "dark";
    rootEl.setAttribute("data-theme", isDark ? "light" : "dark");
    localStorage.setItem("fec-theme", isDark ? "light" : "dark");
  });

  // Populate hero stats
  document.getElementById("statFolders").textContent = data.meta.totalFolders;
  document.getElementById("statFiles").textContent = `${data.meta.totalFiles}+`;

  // Render Latest Drive Updates
  const lastSyncedBadge = document.getElementById("lastSyncedBadge");
  if (lastSyncedBadge && data.meta.lastSyncedAt) {
    lastSyncedBadge.textContent = `Last synced: ${data.meta.lastSyncedAt}`;
  }
  const latestGrid = document.getElementById("latestGrid");
  if (latestGrid && Array.isArray(data.latestUpdates)) {
    data.latestUpdates.forEach((item) => {
      const a = document.createElement("a");
      a.className = "latest-card";
      a.href = item.type === "folder" ? driveFolderUrl(item.id) : driveFileUrl(item.id);
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      const badge = item.type === "folder" ? "FOLDER" : getExt(item.name);
      a.innerHTML = `
        <div class="latest-card-top">
          <span class="latest-course-tag">${item.course}</span>
          <span class="latest-date">${item.date}</span>
        </div>
        <div class="latest-name" title="${item.name}">${item.name}</div>
        <div class="latest-card-top">
          <span class="ext-badge">${badge}</span>
          <span class="latest-date">Open in Drive ↗</span>
        </div>
      `;
      latestGrid.appendChild(a);
    });
  }

  // Split sections into Courses, PYQ, Extra
  const courseSections = data.sections.filter((s) => s.type === "Theory" || s.type === "Sessional");
  const pyqSections = data.sections.filter((s) => s.type === "PYQ");
  const extraSections = data.sections.filter((s) => s.type === "Extra");

  // Render Course Cards
  const coursesGrid = document.getElementById("coursesGrid");
  const renderCourses = (filter = "all") => {
    coursesGrid.innerHTML = "";
    const filtered = courseSections.filter((s) => filter === "all" || s.type === filter);
    filtered.forEach((sec) => {
      const fileCount = countSectionFiles(sec);
      const subCount = sec.subfolders.length;
      const card = document.createElement("article");
      card.className = "course-card";
      card.innerHTML = `
        <div class="card-top">
          <span class="course-code" style="background:${sec.color}">${sec.code}</span>
          <span class="type-badge">${sec.type}</span>
        </div>
        <h3>${sec.title}</h3>
        <div class="card-stats">${fileCount} files${subCount ? ` • ${subCount} subfolders` : ""}</div>
        <div class="subfolder-chips">
          ${sec.subfolders
            .slice(0, 5)
            .map((sub, idx) => `<button class="chip" type="button" data-sub="${idx}">${sub.name}</button>`)
            .join("")}
          ${sec.subfolders.length > 5 ? `<span class="chip">+${sec.subfolders.length - 5} more</span>` : ""}
        </div>
        <div class="card-actions">
          <button class="btn btn-primary btn-sm browse-btn" type="button">Browse Materials</button>
          <a class="btn btn-ghost btn-sm" href="${driveFolderUrl(sec.id)}" target="_blank" rel="noopener noreferrer">Drive ↗</a>
        </div>
      `;

      card.querySelector(".browse-btn").addEventListener("click", () => openModal(sec));
      card.querySelectorAll("button.chip[data-sub]").forEach((btn) => {
        btn.addEventListener("click", () => openModal(sec, Number(btn.dataset.sub)));
      });
      coursesGrid.appendChild(card);
    });
  };

  renderCourses("all");

  document.getElementById("courseFilters").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-filter]");
    if (!btn) return;
    document.querySelectorAll("#courseFilters .pill").forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    renderCourses(btn.dataset.filter);
  });

  // Render Special Cards (PYQ & Extra)
  const renderSpecial = (sections, containerId) => {
    const container = document.getElementById(containerId);
    container.innerHTML = "";
    sections.forEach((sec) => {
      const fileCount = countSectionFiles(sec);
      const card = document.createElement("article");
      card.className = "course-card";
      card.innerHTML = `
        <div class="card-top">
          <span class="course-code" style="background:${sec.color}">${sec.code}</span>
          <span class="type-badge">${sec.subfolders.length} folders • ${fileCount} files</span>
        </div>
        <h3>${sec.title}</h3>
        <div class="subfolder-chips">
          ${sec.subfolders
            .map((sub, idx) => `<button class="chip" type="button" data-sub="${idx}">${sub.name}</button>`)
            .join("")}
        </div>
        <div class="card-actions">
          <button class="btn btn-primary btn-sm browse-btn" type="button">Explore Archive</button>
          <a class="btn btn-ghost btn-sm" href="${driveFolderUrl(sec.id)}" target="_blank" rel="noopener noreferrer">Drive ↗</a>
        </div>
      `;
      card.querySelector(".browse-btn").addEventListener("click", () => openModal(sec));
      card.querySelectorAll("button.chip[data-sub]").forEach((btn) => {
        btn.addEventListener("click", () => openModal(sec, Number(btn.dataset.sub)));
      });
      container.appendChild(card);
    });
  };

  renderSpecial(pyqSections, "pyqGrid");
  renderSpecial(extraSections, "extraGrid");

  // Render Root Quick Files
  const rootFilesGrid = document.getElementById("rootFilesGrid");
  data.rootFiles.forEach((f) => {
    const a = document.createElement("a");
    a.className = "quick-file-card";
    a.href = driveFileUrl(f.id);
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.innerHTML = `
      <div class="quick-file-info">
        <div class="quick-file-name" title="${f.name}">${f.name}</div>
        <div class="quick-file-meta">${f.meta || "Google Drive File"}</div>
      </div>
      <span class="ext-badge">${getExt(f.name)}</span>
    `;
    rootFilesGrid.appendChild(a);
  });

  // Build flat search index
  const searchIndex = [];
  data.rootFiles.forEach((f) => {
    searchIndex.push({ name: f.name, path: "Root Folder", id: f.id, type: "file", meta: f.meta });
  });
  data.sections.forEach((sec) => {
    searchIndex.push({ name: sec.rawName, path: sec.code, id: sec.id, type: "folder", meta: `${sec.type} Folder` });
    sec.files.forEach((f) => {
      searchIndex.push({ name: f.name, path: `${sec.code}`, id: f.id, type: "file", meta: f.meta });
    });
    sec.subfolders.forEach((sub) => {
      searchIndex.push({ name: sub.name, path: `${sec.code} › Subfolder`, id: sub.id, type: "folder", meta: "Folder" });
      sub.files.forEach((f) => {
        searchIndex.push({ name: f.name, path: `${sec.code} › ${sub.name}`, id: f.id, type: "file", meta: f.meta });
      });
      (sub.subfolders || []).forEach((ss) => {
        searchIndex.push({ name: ss.name, path: `${sec.code} › ${sub.name}`, id: ss.id, type: "folder", meta: "Folder" });
        ss.files.forEach((f) => {
          searchIndex.push({ name: f.name, path: `${sec.code} › ${sub.name} › ${ss.name}`, id: f.id, type: "file", meta: f.meta });
        });
      });
    });
  });

  // Global Search
  const globalSearch = document.getElementById("globalSearch");
  const searchResults = document.getElementById("searchResults");
  const clearSearch = document.getElementById("clearSearch");

  const runGlobalSearch = () => {
    const q = globalSearch.value.trim().toLowerCase();
    clearSearch.classList.toggle("hidden", !q);
    if (!q) {
      searchResults.classList.add("hidden");
      searchResults.innerHTML = "";
      return;
    }

    const matches = searchIndex
      .filter((item) => item.name.toLowerCase().includes(q) || item.path.toLowerCase().includes(q))
      .slice(0, 40);

    searchResults.classList.remove("hidden");
    if (!matches.length) {
      searchResults.innerHTML = `<div class="search-empty">No matching files or folders found for "${q}".</div>`;
      return;
    }

    searchResults.innerHTML = matches
      .map((m) => {
        const url = m.type === "folder" ? driveFolderUrl(m.id) : driveFileUrl(m.id);
        const badge = m.type === "folder" ? "FOLDER" : getExt(m.name);
        return `
          <a class="search-result-item" href="${url}" target="_blank" rel="noopener noreferrer">
            <div class="search-result-main">
              <div class="search-result-title">${m.name}</div>
              <div class="search-result-path">${m.path}${m.meta ? ` • ${m.meta}` : ""}</div>
            </div>
            <span class="ext-badge">${badge}</span>
          </a>
        `;
      })
      .join("");
  };

  globalSearch.addEventListener("input", runGlobalSearch);
  clearSearch.addEventListener("click", () => {
    globalSearch.value = "";
    runGlobalSearch();
    globalSearch.focus();
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".search-wrap")) {
      searchResults.classList.add("hidden");
    }
  });
  globalSearch.addEventListener("focus", () => {
    if (globalSearch.value.trim()) searchResults.classList.remove("hidden");
  });

  // Course Modal Logic
  const modalBackdrop = document.getElementById("modalBackdrop");
  const modalBadge = document.getElementById("modalBadge");
  const modalTitle = document.getElementById("modalTitle");
  const modalDriveLink = document.getElementById("modalDriveLink");
  const modalSearch = document.getElementById("modalSearch");
  const modalCount = document.getElementById("modalCount");
  const modalBody = document.getElementById("modalBody");
  let activeSection = null;
  let activeFocusSub = null;

  const renderFileRows = (files) =>
    files
      .map(
        (f) => `
      <a class="file-row" href="${driveFileUrl(f.id)}" target="_blank" rel="noopener noreferrer">
        <div class="file-row-left">
          <span class="ext-badge">${getExt(f.name)}</span>
          <span class="file-row-name" title="${f.name}">${f.name}</span>
        </div>
        <span class="file-row-meta">${f.meta || "Open ↗"}</span>
      </a>`
      )
      .join("");

  const renderModalContent = () => {
    if (!activeSection) return;
    const q = modalSearch.value.trim().toLowerCase();
    const filterFiles = (arr) => (q ? arr.filter((f) => f.name.toLowerCase().includes(q)) : arr);

    let totalShown = 0;
    let html = "";

    const directFiles = filterFiles(activeSection.files);
    totalShown += directFiles.length;
    if (directFiles.length) {
      html += `
        <details class="folder-block" open>
          <summary class="folder-summary">
            <span class="folder-summary-left">📄 Direct Files (${directFiles.length})</span>
            <span class="folder-summary-right">
              <a class="folder-link" href="${driveFolderUrl(activeSection.id)}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()">Drive ↗</a>
            </span>
          </summary>
          <div class="file-list">${renderFileRows(directFiles)}</div>
        </details>
      `;
    }

    activeSection.subfolders.forEach((sub, idx) => {
      const subFiles = filterFiles(sub.files);
      const nestedBlocks = (sub.subfolders || [])
        .map((ss) => {
          const ssFiles = filterFiles(ss.files);
          totalShown += ssFiles.length;
          if (q && !ssFiles.length && !ss.name.toLowerCase().includes(q)) return "";
          return `
            <details class="folder-block sub-folder-nested" ${q ? "open" : ""}>
              <summary class="folder-summary">
                <span class="folder-summary-left">📁 ${ss.name} (${ssFiles.length})</span>
                <span class="folder-summary-right">
                  <a class="folder-link" href="${driveFolderUrl(ss.id)}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()">Drive ↗</a>
                </span>
              </summary>
              <div class="file-list">${renderFileRows(ssFiles)}</div>
            </details>
          `;
        })
        .join("");

      totalShown += subFiles.length;
      if (q && !subFiles.length && !nestedBlocks && !sub.name.toLowerCase().includes(q)) return;

      const isOpen = Boolean(q) || activeFocusSub === idx || (activeFocusSub === null && subFiles.length <= 25 && idx === 0 && !directFiles.length);
      html += `
        <details class="folder-block" ${isOpen ? "open" : ""}>
          <summary class="folder-summary">
            <span class="folder-summary-left">📁 ${sub.name} (${sub.files.length}${(sub.subfolders || []).length ? ` + ${sub.subfolders.length} folders` : ""})</span>
            <span class="folder-summary-right">
              <a class="folder-link" href="${driveFolderUrl(sub.id)}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()">Drive ↗</a>
            </span>
          </summary>
          ${subFiles.length ? `<div class="file-list">${renderFileRows(subFiles)}</div>` : ""}
          ${nestedBlocks}
        </details>
      `;
    });

    modalCount.textContent = `${totalShown} files`;
    modalBody.innerHTML = html || `<div class="search-empty">No files match "${q}".</div>`;
  };

  const openModal = (sec, focusSubIdx = null) => {
    activeSection = sec;
    activeFocusSub = focusSubIdx;
    modalBadge.textContent = sec.code;
    modalBadge.style.background = sec.color;
    modalTitle.textContent = sec.title;
    modalDriveLink.href = driveFolderUrl(sec.id);
    modalSearch.value = "";
    renderModalContent();
    modalBackdrop.classList.remove("hidden");
    document.body.style.overflow = "hidden";
  };

  const closeModal = () => {
    modalBackdrop.classList.add("hidden");
    document.body.style.overflow = "";
    activeSection = null;
  };

  modalSearch.addEventListener("input", renderModalContent);
  document.getElementById("modalClose").addEventListener("click", closeModal);
  modalBackdrop.addEventListener("click", (e) => {
    if (e.target === modalBackdrop) closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modalBackdrop.classList.contains("hidden")) closeModal();
  });

  // ==========================================
  // AI Study Assistant Chatbot
  // ==========================================
  const chatFab = document.getElementById("chatFab");
  const chatWidget = document.getElementById("chatWidget");
  const chatMessages = document.getElementById("chatMessages");
  const chatForm = document.getElementById("chatForm");
  const chatInput = document.getElementById("chatInput");

  const COURSE_ALIASES = [
    { code: "CE 401", keys: ["401", "ce 401", "ce401", "numerical", "interpolation", "curve fitting", "matrix", "নিউমেরিক্যাল"] },
    { code: "CE 402", keys: ["402", "ce 402", "ce402", "solid", "sm2", "sm-2", "mohr", "torsion", "column", "deflection", "spring", "conjugate", "সলিড"] },
    { code: "CE 403", keys: ["403", "ce 403", "ce403", "quantity", "surveying", "qs", "estimation", "plaster", "কোয়ান্টিটি", "সার্ভেয়িং", "এস্টিমেশন"] },
    { code: "CE 404", keys: ["404", "ce 404", "ce404", "fluid", "bernoulli", "pipe", "orifice", "notch", "weir", "hydrostatic", "ফ্লুইড"] },
    { code: "CE 405", keys: ["405", "ce 405", "ce405", "fluid sessional", "hydraulic bench", "tilting", "fluid lab"] },
    { code: "CSE 401", keys: ["cse", "cse 401", "c program", "programming", "viva", "gcd", "lcm", "প্রোগ্রামিং", "ভাইভা"] },
    { code: "HUM 401", keys: ["hum", "hum 401", "accounting", "cvp", "capital budgeting", "overhead", "cost", "অ্যাকাউন্টিং", "হিসাব"] },
    { code: "Math 401", keys: ["math", "math 401", "fourier", "harmonic", "3d", "3-d", "geometry", "plane", "straight line", "ম্যাথ", "ফুরিয়ার"] },
  ];

  const YOUTUBE_SUGGESTIONS = {
    "CE 401": [
      { label: "Numerical Methods (Newton-Raphson, Interpolation, Integration)", q: "Numerical Methods Engineering lecture Newton Raphson Interpolation" },
      { label: "Curve Fitting & Matrix Inversion Tutorial", q: "Numerical Methods Curve Fitting Gauss Elimination Matrix Inversion" },
      { label: "Basic C Programming for Beginners (Bangla)", q: "C Programming Bangla full course Anisul Islam Tamim Shahriar" }
    ],
    "CE 402": [
      { label: "Mohr's Circle & Combined Stress", q: "Mechanics of Solids Mohr's Circle Combined Stress Civil Engineering" },
      { label: "Beam Deflection (Double Integration, Moment Area, Conjugate Beam)", q: "Deflection of Beams Conjugate Beam Moment Area Method" },
      { label: "Torsion, Helical Spring & Column Buckling", q: "Mechanics of Materials Torsion Helical Spring Column Buckling Euler" }
    ],
    "CE 403": [
      { label: "Building Estimation & Quantity Surveying (Excel + AutoCAD)", q: "Quantity Surveying Building Estimation Civil Engineering" },
      { label: "Plaster, Paint, Brickwork & Slab Rod Estimation", q: "Plaster Paint Brickwork Concrete Estimation Civil Engineering" }
    ],
    "CE 404": [
      { label: "Fluid Statics, Hydrostatic Force & Pressure Measurement", q: "Fluid Mechanics Hydrostatic Force Pressure Manometer" },
      { label: "Bernoulli's Equation, Kinematics & Pipe Flow Problems", q: "Fluid Mechanics Bernoulli Equation Pipe Flow Darcy Weisbach" },
      { label: "Orifice, Mouthpiece, Notch & Weir", q: "Fluid Mechanics Orifice Mouthpiece Notch and Weir" }
    ],
    "CE 405": [
      { label: "Hydraulic Bench, V-Notch & Rectangular Weir Lab", q: "Fluid Mechanics Lab V Notch Rectangular Weir Orifice Experiment" },
      { label: "Tilting Flow Channel Experiment", q: "Tilting Flume Open Channel Flow Fluid Mechanics Lab" }
    ],
    "CSE 401": [
      { label: "C Programming Lab Problems (Loops, Conditions, GCD/LCM)", q: "C Programming Lab GCD LCM Prime Leap Year Bangla" },
      { label: "C Programming Viva Preparation", q: "C Programming Viva Questions and Answers" }
    ],
    "HUM 401": [
      { label: "Accounting Equation & Recording Process (Journal/Ledger)", q: "Principles of Accounting Recording Process Weygandt Kimmel Kieso" },
      { label: "CVP Analysis, Overhead & Cost Sheet", q: "Cost Volume Profit CVP Analysis Cost Sheet Overhead Accounting" },
      { label: "Capital Budgeting (NPV, IRR, Payback Period)", q: "Capital Budgeting NPV IRR Payback Period Accounting" }
    ],
    "Math 401": [
      { label: "3D Co-ordinate Geometry (Plane, Straight Line, Sphere)", q: "3D Coordinate Geometry Plane Straight Line Sphere Engineering Math" },
      { label: "Fourier Series & Fourier Integral", q: "Fourier Series Fourier Integral Engineering Mathematics" },
      { label: "Harmonic Functions & Laplace Equation", q: "Harmonic Functions Laplace Equation Engineering Mathematics" }
    ]
  };

  const ytSearchUrl = (q) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;

  const collectSectionFiles = (sec) => {
    const out = [];
    sec.files.forEach((f) => out.push({ ...f, folder: sec.code }));
    sec.subfolders.forEach((sub) => {
      sub.files.forEach((f) => out.push({ ...f, folder: sub.name }));
      (sub.subfolders || []).forEach((ss) => {
        ss.files.forEach((f) => out.push({ ...f, folder: `${sub.name} › ${ss.name}` }));
      });
    });
    return out;
  };

  const renderBotHtml = (html, afterInsert) => {
    const div = document.createElement("div");
    div.className = "chat-msg chat-msg-bot";
    div.innerHTML = html;
    chatMessages.appendChild(div);
    if (afterInsert) afterInsert(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  };

  const renderUserMsg = (text) => {
    const div = document.createElement("div");
    div.className = "chat-msg chat-msg-user";
    div.textContent = text;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  };

  const renderWelcome = () => {
    chatMessages.innerHTML = "";
    renderBotHtml(`
      <div><strong>আসসালামু আলাইকুম!</strong> আমি আপনার <strong>FEC CE-11 Study AI</strong>।</div>
      <div style="margin-top:4px;">পরীক্ষার আগে কি পড়বেন বুঝতে পারছেন না? কোর্সের নাম লিখে জিজ্ঞেস করুন (যেমন: <em>"CE 402 পরীক্ষায় কি পড়ব?"</em>) অথবা নিচের কোর্স থেকে বেছে নিন:</div>
      <div class="chat-quick-chips">
        ${courseSections.map((c) => `<button class="chat-chip" type="button" data-ask="${c.code} পরীক্ষায় কি পড়ব?">${c.code}</button>`).join("")}
        <button class="chat-chip" type="button" data-ask="PYQ সব প্রশ্ন দাও">PYQ Bank</button>
      </div>
    `, attachChipHandlers);
  };

  const buildStudyPlan = (sec) => {
    const allFiles = collectSectionFiles(sec);
    const has = (name, words) => words.some((w) => name.toLowerCase().includes(w));

    const suggestions = allFiles.filter((f) => has(f.name, ["sugg", "important", "theor", "formula", "basic"])).slice(0, 5);
    const pyqs = allFiles.filter((f) => has(f.name, ["pyq", "qna", "pq", "solve", "previous", "ex question", "ct", "question"])).slice(0, 6);
    const notes = allFiles.filter((f) => has(f.name, ["nur hasan", "lecture", "note", "anowar", "shamsur", "opu", "oishi", "rabbani", "chapter", "bec", "mec"]) && !suggestions.includes(f) && !pyqs.includes(f)).slice(0, 6);
    const books = allFiles.filter((f) => has(f.name, ["book", "singer", "khurmi", "bansal", "modi", "weygandt", "halim", "rajput", "lab", "report"])).slice(0, 4);

    // Also pull matching PYQs from PYQ sections
    const extraPyqs = [];
    const kw = sec.code.split(" ")[1] || sec.code;
    const topicKw = sec.code === "CE 402" ? "solid" : sec.code === "CE 404" ? "fluid" : sec.code === "CE 401" ? "numeric" : sec.code === "HUM 401" ? "accounting" : sec.code === "Math 401" ? "math" : kw.toLowerCase();
    pyqSections.forEach((ps) => {
      collectSectionFiles(ps).forEach((f) => {
        if (f.name.toLowerCase().includes(topicKw) || f.name.toLowerCase().includes(kw.toLowerCase())) {
          extraPyqs.push(f);
        }
      });
    });
    const combinedPyqs = [...pyqs, ...extraPyqs].slice(0, 6);

    const groupHtml = (title, items) => {
      if (!items.length) return "";
      return `
        <div class="chat-plan-group">
          <div class="chat-plan-title">${title}</div>
          <div class="chat-plan-links">
            ${items.map((f) => `<a class="chat-plan-link" href="${driveFileUrl(f.id)}" target="_blank" rel="noopener noreferrer" title="${f.name}"><span>${f.name}</span><span>↗</span></a>`).join("")}
          </div>
        </div>
      `;
    };

    const ytList = (YOUTUBE_SUGGESTIONS[sec.code] || []).map((yt) => ({
      name: yt.label,
      url: ytSearchUrl(yt.q),
    }));

    const ytHtml = ytList.length
      ? `
        <div class="chat-plan-group">
          <div class="chat-plan-title">🎥 ৫. ইউটিউব ভিডিও লেকচার (YouTube)</div>
          <div class="chat-plan-links">
            ${ytList.map((y) => `<a class="chat-plan-link" href="${y.url}" target="_blank" rel="noopener noreferrer" title="${y.name}"><span>▶ ${y.name}</span><span>↗</span></a>`).join("")}
          </div>
        </div>
      `
      : "";

    renderBotHtml(`
      <div><strong>${sec.code}: ${sec.title}</strong>-এর পরীক্ষার জন্য সাজানো স্টাডি প্ল্যান:</div>
      ${groupHtml("🎯 ১. সাজেশন ও গুরুত্বপূর্ণ টপিক", suggestions)}
      ${groupHtml("📝 ২. বিগত বছরের প্রশ্ন ও সলভ (PYQ / CT)", combinedPyqs)}
      ${groupHtml("📒 ৩. সেরা হ্যান্ডনোট ও টিচার লেকচার", notes)}
      ${groupHtml("📚 ৪. রেফারেন্স বই ও ল্যাব ম্যাটেরিয়াল", books)}
      ${ytHtml}
      <div class="chat-quick-chips">
        <button class="chat-chip chat-open-modal" type="button">সব ফাইল দেখুন (${allFiles.length})</button>
        <a class="chat-chip" style="text-decoration:none;" href="${driveFolderUrl(sec.id)}" target="_blank" rel="noopener noreferrer">Drive ফোল্ডার ↗</a>
      </div>
    `, (el) => {
      el.querySelector(".chat-open-modal")?.addEventListener("click", () => openModal(sec));
    });
  };

  const handleChatQuery = (raw) => {
    const q = raw.trim();
    if (!q) return;
    renderUserMsg(q);
    const lower = q.toLowerCase();

    // 1. Check specific course match
    let matchedCourse = null;
    for (const alias of COURSE_ALIASES) {
      if (alias.keys.some((k) => lower.includes(k))) {
        matchedCourse = courseSections.find((s) => s.code === alias.code);
        if (matchedCourse) break;
      }
    }

    if (matchedCourse) {
      buildStudyPlan(matchedCourse);
      return;
    }

    // 2. Check PYQ request
    if (["pyq", "previous", "question", "ct", "প্রশ্ন", "বিগত", "সিটি"].some((k) => lower.includes(k))) {
      const pyqFiles = pyqSections.flatMap((s) => collectSectionFiles(s)).slice(0, 8);
      renderBotHtml(`
        <div><strong>বিগত বছরের প্রশ্ন ও সিটি (PYQ &amp; CT Bank)</strong> থেকে গুরুত্বপূর্ণ কিছু ফাইল:</div>
        <div class="chat-plan-group">
          <div class="chat-plan-links">
            ${pyqFiles.map((f) => `<a class="chat-plan-link" href="${driveFileUrl(f.id)}" target="_blank" rel="noopener noreferrer"><span>${f.name}</span><span>↗</span></a>`).join("")}
          </div>
        </div>
        <div class="chat-quick-chips">
          ${pyqSections.map((ps, i) => `<button class="chat-chip chat-pyq-open" data-idx="${i}" type="button">${ps.code} খুলুন</button>`).join("")}
        </div>
      `, (el) => {
        el.querySelectorAll(".chat-pyq-open").forEach((b) => {
          b.addEventListener("click", () => openModal(pyqSections[Number(b.dataset.idx)]));
        });
      });
      return;
    }

    // 3. Direct file search fallback
    const tokens = lower.split(/\s+/).filter((t) => t.length >= 3 && !["কি", "পড়ব", "exam", "for", "the", "and", "পরীক্ষা", "পরীক্ষায়"].includes(t));
    const directMatches = tokens.length
      ? searchIndex.filter((item) => item.type === "file" && tokens.some((t) => item.name.toLowerCase().includes(t))).slice(0, 7)
      : [];

    if (directMatches.length) {
      renderBotHtml(`
        <div>আপনার প্রশ্নের সাথে মিলে যাওয়া ফাইলগুলো:</div>
        <div class="chat-plan-group">
          <div class="chat-plan-links">
            ${directMatches.map((f) => `<a class="chat-plan-link" href="${driveFileUrl(f.id)}" target="_blank" rel="noopener noreferrer"><span>${f.name}</span><span>↗</span></a>`).join("")}
          </div>
        </div>
        <div class="chat-plan-group">
          <div class="chat-plan-title">🎥 এই টপিকের ইউটিউব ভিডিও</div>
          <div class="chat-plan-links">
            <a class="chat-plan-link" href="${ytSearchUrl(q + ' Civil Engineering lecture')}" target="_blank" rel="noopener noreferrer"><span>▶ "${q}" — YouTube-এ ভিডিও দেখুন</span><span>↗</span></a>
          </div>
        </div>
      `);
      return;
    }

    // 4. Generic "এই পরীক্ষা কি পড়ব?" prompt -> ask which course
    renderBotHtml(`
      <div>আপনি কোন কোর্সের পরীক্ষার প্রস্তুতি নিতে চাচ্ছেন? নিচের যেকোনো একটি কোর্স সিলেক্ট করুন, আমি সাথে সাথে সাজেশন, PYQ ও নোটস সাজিয়ে দিচ্ছি:</div>
      <div class="chat-quick-chips">
        ${courseSections.map((c) => `<button class="chat-chip" type="button" data-ask="${c.code} পরীক্ষায় কি পড়ব?">${c.code}</button>`).join("")}
        <button class="chat-chip" type="button" data-ask="PYQ সব প্রশ্ন দাও">PYQ Bank</button>
      </div>
    `, attachChipHandlers);
  };

  function attachChipHandlers(container) {
    container.querySelectorAll(".chat-chip[data-ask]").forEach((btn) => {
      btn.addEventListener("click", () => handleChatQuery(btn.dataset.ask));
    });
  }

  renderWelcome();

  chatFab.addEventListener("click", () => {
    chatWidget.classList.toggle("hidden");
    if (!chatWidget.classList.contains("hidden")) chatInput.focus();
  });
  document.getElementById("chatClose").addEventListener("click", () => chatWidget.classList.add("hidden"));
  document.getElementById("chatClear").addEventListener("click", renderWelcome);
  chatForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const val = chatInput.value;
    chatInput.value = "";
    handleChatQuery(val);
  });
})();
