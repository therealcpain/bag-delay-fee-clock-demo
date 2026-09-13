/**
 * Bag Delay Fee Refund Clock — client-side MVP
 * Arrival / deplane → hours vs DOT 12/15/30h significant-delay threshold
 * + MBR chip + "automatic bag-fee refund due?" share card.
 * Public DOT refunds + 14 CFR §260.5 framing only. Labeled seeds OK.
 * Never invents airline delivery ETAs. Not a claim filer. Not legal advice.
 */
(function (root) {
  "use strict";

  const CITES = {
    refunds:
      "https://www.transportation.gov/individuals/aviation-consumer-protection/refunds",
    cfr: "https://www.law.cornell.edu/cfr/text/14/260.5",
    atcr:
      "https://www.transportation.gov/resources/individuals/aviation-consumer-protection/august-2026-air-travel-consumer-report-june-and",
    recirc:
      "https://travelprnews.com/us-airline-baggage-data-shows-wide-gap-in-mishandling-rates-as-overall-performance-improves/travel-press-release/2026/09/01/",
  };

  const CITE_ONE_LINER =
    "DOT: bag-fee refund when a checked bag is lost or significantly delayed — domestic not delivered within 12 hours after opportunity to deplane; international 15 hours (flight ≤12h) or 30 hours (flight >12h). Clock starts at deplane opportunity at the final destination and ends at pickup / agreed delivery. Passenger must file a Mishandled Baggage Report; refund is automatic once MBR + significant delay. 14 CFR §260.5. Not legal advice.";

  /**
   * Teaching seeds — labeled redacted arrival/delivery math.
   * Not live airline data. Never invent a carrier's delivery ETA.
   */
  const SEEDS = [
    {
      id: "dom-14h-mbr",
      label: "Domestic · 14h + MBR",
      tag: "Past 12h · refund may be due",
      arriveDate: "2026-09-01",
      arriveTime: "08:00",
      tz: "America/Chicago",
      scope: "domestic",
      intlDuration: "short",
      bagStatus: "delivered",
      endDate: "2026-09-01",
      endTime: "22:10",
      asOfDate: "2026-09-01",
      asOfTime: "22:10",
      mbr: true,
      feePaid: 40,
      feeKnown: true,
      noteLabel: "redacted ORD carousel · teaching",
    },
    {
      id: "dom-6h-missing",
      label: "Domestic · 6h still out",
      tag: "Not yet · 12h line",
      arriveDate: "2026-09-12",
      arriveTime: "14:00",
      tz: "America/Chicago",
      scope: "domestic",
      intlDuration: "short",
      bagStatus: "missing",
      endDate: "",
      endTime: "",
      asOfDate: "2026-09-12",
      asOfTime: "20:00",
      mbr: false,
      feePaid: 35,
      feeKnown: true,
      noteLabel: "still at carousel · teaching",
    },
    {
      id: "intl-15h",
      label: "Intl ≤12h flight · 16h",
      tag: "Past 15h + MBR",
      arriveDate: "2026-08-28",
      arriveTime: "09:00",
      tz: "America/New_York",
      scope: "intl",
      intlDuration: "short",
      bagStatus: "delivered",
      endDate: "2026-08-29",
      endTime: "01:05",
      asOfDate: "2026-08-29",
      asOfTime: "01:05",
      mbr: true,
      feePaid: 60,
      feeKnown: true,
      noteLabel: "short-haul intl · teaching",
    },
    {
      id: "intl-30h",
      label: "Intl >12h flight · 31h",
      tag: "Past 30h + MBR",
      arriveDate: "2026-08-20",
      arriveTime: "16:00",
      tz: "America/Los_Angeles",
      scope: "intl",
      intlDuration: "long",
      bagStatus: "delivered",
      endDate: "2026-08-21",
      endTime: "23:10",
      asOfDate: "2026-08-21",
      asOfTime: "23:10",
      mbr: true,
      feePaid: 75,
      feeKnown: true,
      noteLabel: "long-haul intl · teaching",
    },
    {
      id: "past-no-mbr",
      label: "Past 12h · no MBR",
      tag: "Threshold yes · file MBR",
      arriveDate: "2026-09-04",
      arriveTime: "11:30",
      tz: "America/New_York",
      scope: "domestic",
      intlDuration: "short",
      bagStatus: "missing",
      endDate: "",
      endTime: "",
      asOfDate: "2026-09-05",
      asOfTime: "08:00",
      mbr: false,
      feePaid: 35,
      feeKnown: true,
      noteLabel: "hotel delivery wait · teaching",
    },
    {
      id: "delivered-early",
      label: "Delivered · 8h domestic",
      tag: "Before 12h line",
      arriveDate: "2026-09-08",
      arriveTime: "10:00",
      tz: "America/Chicago",
      scope: "domestic",
      intlDuration: "short",
      bagStatus: "delivered",
      endDate: "2026-09-08",
      endTime: "18:00",
      asOfDate: "2026-09-08",
      asOfTime: "18:00",
      mbr: true,
      feePaid: 40,
      feeKnown: true,
      noteLabel: "late but under 12h · teaching",
    },
  ];

  let lastResult = null;

  function $(id) {
    return document.getElementById(id);
  }

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function num(v) {
    const n = parseFloat(v);
    return Number.isFinite(n) && n >= 0 ? n : NaN;
  }

  function money(n) {
    if (!Number.isFinite(n)) return "—";
    return "$" + (Math.round(n * 100) / 100).toFixed(n % 1 ? 2 : 0);
  }

  function zonedParts(date, timeZone) {
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      weekday: "short",
      hour12: false,
    });
    const map = {};
    for (const p of fmt.formatToParts(date)) {
      if (p.type !== "literal") map[p.type] = p.value;
    }
    let hour = parseInt(map.hour, 10);
    if (hour === 24) hour = 0;
    return {
      year: parseInt(map.year, 10),
      month: parseInt(map.month, 10),
      day: parseInt(map.day, 10),
      hour: hour,
      minute: parseInt(map.minute, 10),
      weekday: map.weekday,
      ymd: map.year + "-" + map.month + "-" + map.day,
    };
  }

  function localWallToUtc(ymd, hm, timeZone) {
    if (!ymd || !hm || !timeZone) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
    if (!/^\d{2}:\d{2}$/.test(hm)) return null;
    const [y, mo, d] = ymd.split("-").map(Number);
    const [hh, mm] = hm.split(":").map(Number);
    let guess = Date.UTC(y, mo - 1, d, hh, mm, 0);
    for (let i = 0; i < 3; i++) {
      const parts = zonedParts(new Date(guess), timeZone);
      const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, 0);
      const target = Date.UTC(y, mo - 1, d, hh, mm, 0);
      guess += target - asUtc;
    }
    const out = new Date(guess);
    return isNaN(out.getTime()) ? null : out;
  }

  function formatLocalLine(ymd, hm, tz) {
    if (!ymd || !hm) return "—";
    const short = (tz || "").split("/").pop() || tz;
    return ymd + " " + hm + " " + short;
  }

  function hoursLabel(h) {
    if (!Number.isFinite(h)) return "—";
    const abs = Math.abs(h);
    const whole = Math.floor(abs);
    const mins = Math.round((abs - whole) * 60);
    if (mins === 60) return whole + 1 + ".0h";
    if (mins === 0) return whole + ".0h";
    return whole + "h " + pad(mins) + "m";
  }

  function hoursDecimal(h) {
    if (!Number.isFinite(h)) return "—";
    return (Math.round(h * 10) / 10).toFixed(1) + "h";
  }

  /**
   * DOT significant-delay thresholds for the checked-bag *fee* refund.
   * Domestic 12h; intl 15h if flight ≤12h; intl 30h if flight >12h.
   */
  function thresholdHours(scope, intlDuration) {
    if (scope === "domestic") return 12;
    if (scope === "intl") {
      if (intlDuration === "long") return 30;
      if (intlDuration === "short") return 15;
    }
    return NaN;
  }

  function thresholdText(scope, intlDuration) {
    if (scope === "domestic") return "domestic 12h";
    if (scope === "intl" && intlDuration === "long") return "international 30h (flight >12h)";
    if (scope === "intl") return "international 15h (flight ≤12h)";
    return "threshold unknown";
  }

  function computeClock(input) {
    const thresh = thresholdHours(input.scope, input.intlDuration);
    if (!Number.isFinite(thresh)) {
      return { ok: false, error: "Pick domestic or international (and flight length if international)." };
    }
    if (!input.arriveDate || !input.arriveTime) {
      return { ok: false, error: "Enter the deplane / arrival date and time. No invented clock." };
    }
    const start = localWallToUtc(input.arriveDate, input.arriveTime, input.tz);
    if (!start) {
      return { ok: false, error: "Arrival time didn’t parse. Check date, time, and timezone." };
    }

    let endYmd;
    let endHm;
    let endKind;
    if (input.bagStatus === "delivered") {
      endYmd = input.endDate;
      endHm = input.endTime;
      endKind = "delivered";
      if (!endYmd || !endHm) {
        return { ok: false, error: "Enter when the bag was delivered or picked up — or switch to still missing." };
      }
    } else if (input.bagStatus === "missing") {
      endYmd = input.asOfDate;
      endHm = input.asOfTime;
      endKind = "as-of (still missing)";
      if (!endYmd || !endHm) {
        return { ok: false, error: "Still missing — enter an as-of date and time (no invented “now”)." };
      }
    } else {
      return { ok: false, error: "Say whether the bag was delivered or is still missing." };
    }

    const end = localWallToUtc(endYmd, endHm, input.tz);
    if (!end) {
      return { ok: false, error: "End / as-of time didn’t parse. Check date, time, and timezone." };
    }
    if (end.getTime() < start.getTime()) {
      return {
        ok: false,
        error: "Delivery / as-of is before the deplane opportunity — check the times. No invented hours.",
      };
    }

    const elapsedHours = (end.getTime() - start.getTime()) / 3600000;
    const past = elapsedHours + 1e-9 >= thresh;
    const remaining = Math.max(0, thresh - elapsedHours);
    const over = Math.max(0, elapsedHours - thresh);
    const pctOfThresh = (elapsedHours / thresh) * 100;
    const fee = input.feeKnown ? num(input.feePaid) : NaN;

    let statusKey;
    let pillText;
    let pillClass;
    let dueText;
    let dueChip;
    let dueChipClass;
    let plain;
    let action;

    if (past && input.mbr) {
      statusKey = "due";
      pillText = "Fee refund may be due";
      pillClass = "due";
      dueText = "May be due — past threshold + MBR filed";
      dueChip = "Automatic refund: may be due";
      dueChipClass = "due";
      plain =
        "You are past the DOT significant-delay line (" +
        thresholdText(input.scope, input.intlDuration) +
        ") and marked MBR filed. DOT: the checked-bag fee refund is automatic once both are true. Confirm the airline has the MBR — this card does not file it or move money.";
      action = "Confirm the MBR with the airline. Details at transportation.gov refunds / 14 CFR §260.5.";
    } else if (past && !input.mbr) {
      statusKey = "file";
      pillText = "Past threshold · file MBR";
      pillClass = "file";
      dueText = "Not automatic yet — file an MBR with the airline";
      dueChip = "Automatic refund: file MBR first";
      dueChipClass = "file";
      plain =
        "You are past the " +
        thresholdText(input.scope, input.intlDuration) +
        " line, but DOT requires a Mishandled Baggage Report before the bag-fee refund is automatic. This tool does not file the MBR.";
      action = "File an MBR with the airline (desk or app), then the fee refund is supposed to be automatic.";
    } else if (input.bagStatus === "delivered") {
      statusKey = "early";
      pillText = "Delivered before threshold";
      pillClass = "early";
      dueText = "Not indicated — delivered before the significant-delay line";
      dueChip = "Automatic refund: not indicated";
      dueChipClass = "early";
      plain =
        "Bag delivered " +
        hoursLabel(elapsedHours) +
        " after deplane — before the " +
        thresholdText(input.scope, input.intlDuration) +
        " line. This clock does not indicate an automatic bag-fee refund. Other claims (contents, inconvenience) are a different path.";
      action = "No bag-fee refund is indicated by the 12/15/30h clock on these times.";
    } else {
      statusKey = "notyet";
      pillText = "Not yet";
      pillClass = "notyet";
      dueText = "Not yet — " + hoursLabel(remaining) + " remain to the " + thresh + "h line";
      dueChip = "Automatic refund: not yet";
      dueChipClass = "notyet";
      plain =
        hoursLabel(elapsedHours) +
        " elapsed of the " +
        thresholdText(input.scope, input.intlDuration) +
        " line. If the bag is still missing, file an MBR now (required for the fee refund) and recheck after delivery or when you pass the threshold.";
      action = "File an MBR if you haven’t. Recheck this clock when the bag arrives or when you pass " + thresh + "h.";
    }

    const title =
      hoursDecimal(elapsedHours) +
      " vs " +
      thresh +
      "h " +
      (input.scope === "domestic" ? "domestic" : "international");

    return {
      ok: true,
      input: input,
      start: start,
      end: end,
      endKind: endKind,
      elapsedHours: elapsedHours,
      remainingHours: remaining,
      overHours: over,
      thresholdHours: thresh,
      thresholdLabel: thresholdText(input.scope, input.intlDuration),
      past: past,
      pctOfThresh: pctOfThresh,
      fee: fee,
      statusKey: statusKey,
      pillText: pillText,
      pillClass: pillClass,
      dueText: dueText,
      dueChip: dueChip,
      dueChipClass: dueChipClass,
      plain: plain,
      action: action,
      title: title,
      cite: CITE_ONE_LINER,
    };
  }

  function readInputs() {
    const scope = $("scope").value;
    const bagStatus = $("bagStatus").value;
    return {
      arriveDate: $("arriveDate").value,
      arriveTime: $("arriveTime").value,
      tz: $("tz").value,
      scope: scope,
      intlDuration: $("intlDuration").value,
      bagStatus: bagStatus,
      endDate: $("endDate").value,
      endTime: $("endTime").value,
      asOfDate: $("asOfDate").value,
      asOfTime: $("asOfTime").value,
      mbr: $("mbr").value === "yes",
      feePaid: $("feePaid").value,
      feeKnown: $("feeKnown").checked,
      noteLabel: ($("noteLabel").value || "").trim(),
    };
  }

  function applyInputs(s) {
    $("arriveDate").value = s.arriveDate || "";
    $("arriveTime").value = s.arriveTime || "";
    $("tz").value = s.tz || "America/Chicago";
    $("scope").value = s.scope || "domestic";
    $("intlDuration").value = s.intlDuration || "short";
    $("bagStatus").value = s.bagStatus || "missing";
    $("endDate").value = s.endDate || "";
    $("endTime").value = s.endTime || "";
    $("asOfDate").value = s.asOfDate || "";
    $("asOfTime").value = s.asOfTime || "";
    $("mbr").value = s.mbr ? "yes" : "no";
    $("feePaid").value = Number.isFinite(s.feePaid) ? s.feePaid : s.feePaid || "";
    $("feeKnown").checked = !!s.feeKnown;
    $("noteLabel").value = s.noteLabel || "";
    syncFieldVisibility();
  }

  function syncFieldVisibility() {
    const intl = $("scope").value === "intl";
    $("intlDuration").disabled = !intl;
    const missing = $("bagStatus").value === "missing";
    $("deliverFields").hidden = missing;
    $("deliverTimeWrap").hidden = missing;
    $("asOfFields").hidden = !missing;
    $("asOfTimeWrap").hidden = !missing;
  }

  function setStatus(msg) {
    $("status").textContent = msg || "";
  }

  function barPercent(pct) {
    if (!Number.isFinite(pct)) return 0;
    return Math.max(2, Math.min(100, pct));
  }

  function showCard(result) {
    lastResult = result;
    $("cardSection").hidden = false;

    const scopeLine =
      result.input.scope === "domestic"
        ? "Domestic · DOT 12h significant-delay line"
        : result.input.intlDuration === "long"
        ? "International · flight >12h · DOT 30h line"
        : "International · flight ≤12h · DOT 15h line";
    $("cardScope").textContent = scopeLine;
    $("cardTitle").textContent = result.title;
    const note = result.input.noteLabel ? " · " + result.input.noteLabel : "";
    $("cardTimes").textContent =
      "Deplane " +
      formatLocalLine(result.input.arriveDate, result.input.arriveTime, result.input.tz) +
      " → " +
      result.endKind +
      " " +
      formatLocalLine(
        result.input.bagStatus === "delivered" ? result.input.endDate : result.input.asOfDate,
        result.input.bagStatus === "delivered" ? result.input.endTime : result.input.asOfTime,
        result.input.tz
      ) +
      note;

    const pill = $("stagePill");
    pill.textContent = result.pillText;
    pill.className = "stage-pill " + result.pillClass;

    $("hoursDisp").textContent = hoursDecimal(result.elapsedHours);
    $("hoursSub").textContent =
      hoursLabel(result.elapsedHours) +
      (result.input.bagStatus === "missing" ? " as of your as-of time" : " until delivery / pickup");
    $("threshDisp").textContent = result.thresholdHours + "h";
    $("threshSub").textContent = result.thresholdLabel + " — text, not color-only";

    $("barStartLabel").textContent = "0h";
    $("barThreshLabel").textContent = "threshold " + result.thresholdHours + "h";
    $("barEndLabel").textContent = hoursDecimal(result.elapsedHours) + " elapsed";

    const fill = $("clockBarFill");
    const tick = $("clockBarTick");
    const bar = $("clockBar");
    const rawPct = result.pctOfThresh;
    fill.style.width = barPercent(rawPct) + "%";
    bar.classList.toggle("past", result.past);
    // Tick sits at the threshold on a scale of max(threshold, elapsed)*1.05
    const scaleMax = Math.max(result.thresholdHours, result.elapsedHours) * 1.05;
    const tickPct = (result.thresholdHours / scaleMax) * 100;
    const fillPct = (result.elapsedHours / scaleMax) * 100;
    fill.style.width = barPercent(fillPct) + "%";
    tick.style.left = "calc(" + Math.max(1, Math.min(98, tickPct)) + "% - 1px)";
    $("barCaption").textContent =
      "Elapsed " +
      hoursLabel(result.elapsedHours) +
      " vs " +
      result.thresholdLabel +
      (result.past
        ? " — PAST the line by " + hoursLabel(result.overHours) + "."
        : " — " + hoursLabel(result.remainingHours) + " remain.");

    const flag = $("barFlag");
    const flagLead = $("barFlagLead");
    const flagDetail = $("barFlagDetail");
    let lead;
    if (result.statusKey === "file") {
      lead = "PAST " + result.thresholdHours + "h · file MBR";
    } else if (result.past) {
      lead = "PAST " + result.thresholdHours + "h · +" + hoursLabel(result.overHours);
    } else if (result.statusKey === "early") {
      lead = "DELIVERED BEFORE " + result.thresholdHours + "h · " + hoursLabel(result.remainingHours) + " under";
    } else {
      lead = "NOT YET · " + hoursLabel(result.remainingHours) + " remain to " + result.thresholdHours + "h";
    }
    flagLead.textContent = lead;
    flagDetail.textContent =
      "White tick = " +
      result.thresholdLabel +
      " (text, not color-only). " +
      (result.past ? "Elapsed is past the line." : "Elapsed has not reached the line.");
    flag.className =
      "clock-bar-flag " + (result.statusKey === "early" ? "early" : result.past ? "past" : "notyet");
    bar.setAttribute(
      "aria-label",
      lead +
        ". Elapsed " +
        hoursLabel(result.elapsedHours) +
        " versus " +
        result.thresholdLabel +
        "."
    );

    const mbrChip = $("mbrChip");
    $("mbrChipLead").textContent = result.input.mbr ? "MBR: filed" : "MBR: not filed";
    $("mbrChipSub").textContent = result.input.mbr
      ? "Required · refund can be automatic"
      : "Required · refund not automatic yet";
    mbrChip.className = "info-chip stacked " + (result.input.mbr ? "yes" : "no");

    const feeChip = $("feeChip");
    if (result.input.feeKnown && Number.isFinite(result.fee)) {
      feeChip.textContent = "Bag fee: " + money(result.fee);
    } else {
      feeChip.textContent = "Bag fee: not entered";
    }
    feeChip.className = "info-chip";

    const dueChip = $("dueChip");
    dueChip.textContent = result.dueChip;
    dueChip.className = "info-chip " + result.dueChipClass;

    $("dueText").textContent = result.dueText;
    $("vsText").textContent =
      hoursDecimal(result.elapsedHours) +
      " elapsed / " +
      result.thresholdHours +
      "h threshold (" +
      result.thresholdLabel +
      ")";
    $("plainText").textContent = result.plain;
    $("citeLinks").innerHTML =
      '<a href="' +
      CITES.refunds +
      '" target="_blank" rel="noopener noreferrer">DOT Refunds</a>' +
      '<a href="' +
      CITES.cfr +
      '" target="_blank" rel="noopener noreferrer">14 CFR §260.5</a>' +
      '<a href="' +
      CITES.atcr +
      '" target="_blank" rel="noopener noreferrer">August 2026 ATCR</a>';
    $("sourcePill").textContent = result.past
      ? "DOT · PAST " + result.thresholdHours + "h"
      : "DOT · under " + result.thresholdHours + "h";
    $("mbrNote").innerHTML =
      result.action +
      ' File the MBR with the airline — not here. <a href="' +
      CITES.refunds +
      '" target="_blank" rel="noopener noreferrer">transportation.gov refunds</a>.';

    writeHash(result.input);
  }

  function onClock() {
    const input = readInputs();
    const result = computeClock(input);
    if (!result.ok) {
      lastResult = null;
      $("cardSection").hidden = true;
      setStatus(result.error);
      return;
    }
    showCard(result);
    setStatus("Clock card ready — share, copy, or export PNG. Not legal advice. Not a claim filer.");
  }

  function writeHash(input) {
    const payload = {
      ad: input.arriveDate,
      at: input.arriveTime,
      z: input.tz,
      sc: input.scope,
      du: input.intlDuration,
      bs: input.bagStatus,
      ed: input.endDate || "",
      et: input.endTime || "",
      od: input.asOfDate || "",
      ot: input.asOfTime || "",
      m: input.mbr ? 1 : 0,
      f: input.feeKnown ? input.feePaid : "",
      k: input.feeKnown ? 1 : 0,
      n: input.noteLabel || "",
    };
    const raw = btoa(unescape(encodeURIComponent(JSON.stringify(payload))))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    const url = new URL(location.href);
    url.hash = "b=" + raw;
    history.replaceState(null, "", url.pathname + url.search + url.hash);
  }

  function decodeHash() {
    const h = location.hash.replace(/^#/, "");
    if (!h.startsWith("b=")) return null;
    try {
      let b64 = h.slice(2).replace(/-/g, "+").replace(/_/g, "/");
      while (b64.length % 4) b64 += "=";
      const json = decodeURIComponent(escape(atob(b64)));
      const p = JSON.parse(json);
      return {
        arriveDate: p.ad,
        arriveTime: p.at,
        tz: p.z,
        scope: p.sc,
        intlDuration: p.du,
        bagStatus: p.bs,
        endDate: p.ed || "",
        endTime: p.et || "",
        asOfDate: p.od || "",
        asOfTime: p.ot || "",
        mbr: !!p.m,
        feePaid: p.f === "" || p.f == null ? "" : Number(p.f),
        feeKnown: !!p.k,
        noteLabel: p.n || "",
      };
    } catch (e) {
      return null;
    }
  }

  function onShare() {
    if (!lastResult) {
      setStatus("Nothing to share yet — show a clock card first.");
      return;
    }
    writeHash(lastResult.input);
    const link = location.href;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(link).then(
        function () {
          setStatus("Share link copied.");
        },
        function () {
          setStatus("Copy failed — grab the URL bar hash.");
        }
      );
    } else {
      setStatus("Share link in URL bar (clipboard unavailable).");
    }
  }

  function summaryText(r) {
    const feeBit =
      r.input.feeKnown && Number.isFinite(r.fee) ? " Bag fee entered: " + money(r.fee) + "." : "";
    return (
      "Bag Delay Fee Refund Clock — " +
      r.title +
      ". " +
      r.dueText +
      ". MBR " +
      (r.input.mbr ? "filed" : "not filed") +
      "." +
      feeBit +
      " " +
      r.plain +
      " Sources: DOT Refunds; 14 CFR §260.5. Not legal advice. Not a claim filer."
    );
  }

  function onCopy() {
    if (!lastResult) {
      setStatus("Nothing to copy yet — show a clock card first.");
      return;
    }
    const text = summaryText(lastResult);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function () {
          setStatus("Summary copied.");
        },
        function () {
          setStatus("Copy failed.");
        }
      );
    } else {
      setStatus("Clipboard unavailable.");
    }
  }

  function clearAll() {
    lastResult = null;
    $("cardSection").hidden = true;
    $("noteLabel").value = "";
    $("feePaid").value = "";
    $("feeKnown").checked = false;
    $("mbr").value = "no";
    $("bagStatus").value = "missing";
    $("scope").value = "domestic";
    $("endDate").value = "";
    $("endTime").value = "";
    setStatus("Cleared. Times only from your paste — nothing invented.");
    const url = new URL(location.href);
    history.replaceState(null, "", url.pathname + url.search);
    document.querySelectorAll(".preset.active").forEach(function (el) {
      el.classList.remove("active");
    });
    syncFieldVisibility();
  }

  function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines) {
    const words = String(text).split(" ");
    let line = "";
    let yy = y;
    let lines = 0;
    const cap = maxLines || 5;
    for (let n = 0; n < words.length; n++) {
      const test = line + words[n] + " ";
      if (ctx.measureText(test).width > maxWidth && n > 0) {
        ctx.fillText(line, x, yy);
        line = words[n] + " ";
        yy += lineHeight;
        lines++;
        if (lines >= cap) {
          ctx.fillText(line.trim() + "…", x, yy);
          return yy;
        }
      } else {
        line = test;
      }
    }
    ctx.fillText(line, x, yy);
    return yy;
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function exportPng() {
    if (!lastResult) {
      setStatus("Show a clock card before exporting PNG.");
      return;
    }
    const r = lastResult;
    const canvas = $("pngCanvas");
    const ctx = canvas.getContext("2d");
    const W = canvas.width;
    const H = canvas.height;

    ctx.fillStyle = "#0b1018";
    ctx.fillRect(0, 0, W, H);
    const grd = ctx.createRadialGradient(120, 0, 20, 120, 0, 420);
    grd.addColorStop(0, "rgba(94,200,192,0.18)");
    grd.addColorStop(1, "rgba(94,200,192,0)");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, 400);

    ctx.fillStyle = "#5ec8c0";
    ctx.font = "700 13px IBM Plex Sans, sans-serif";
    ctx.fillText("BAG DELAY FEE REFUND CLOCK", 48, 44);

    ctx.fillStyle = "#e8eef4";
    ctx.font = "700 26px IBM Plex Sans, sans-serif";
    const title = r.title.length > 54 ? r.title.slice(0, 52) + "…" : r.title;
    ctx.fillText(title, 48, 82);

    ctx.fillStyle = "#8b9aab";
    ctx.font = "400 13px IBM Plex Mono, monospace";
    ctx.fillText(
      "Deplane " +
        formatLocalLine(r.input.arriveDate, r.input.arriveTime, r.input.tz) +
        (r.input.noteLabel ? " · " + r.input.noteLabel : ""),
      48,
      108
    );

    const pillText = r.pillText.toUpperCase();
    ctx.font = "700 11px IBM Plex Sans, sans-serif";
    const pw = Math.min(ctx.measureText(pillText).width + 28, 280);
    const px = W - 48 - pw;
    roundRect(ctx, px, 30, pw, 28, 14);
    ctx.fillStyle =
      r.pillClass === "due"
        ? "rgba(62,207,142,0.18)"
        : r.pillClass === "file"
        ? "rgba(240,113,120,0.18)"
        : r.pillClass === "early"
        ? "rgba(94,200,192,0.18)"
        : "rgba(240,180,41,0.18)";
    ctx.fill();
    ctx.fillStyle =
      r.pillClass === "due"
        ? "#3ecf8e"
        : r.pillClass === "file"
        ? "#f07178"
        : r.pillClass === "early"
        ? "#5ec8c0"
        : "#f0b429";
    ctx.fillText(pillText, px + 14, 48);

    // Giant hours vs threshold
    roundRect(ctx, 48, 128, 390, 118, 12);
    ctx.fillStyle = "#1a2430";
    ctx.fill();
    ctx.fillStyle = "#8b9aab";
    ctx.font = "700 11px IBM Plex Sans, sans-serif";
    ctx.fillText("HOURS SINCE DEPLANE OPPORTUNITY", 68, 154);
    ctx.fillStyle = "#e8eef4";
    ctx.font = "600 42px IBM Plex Mono, monospace";
    ctx.fillText(hoursDecimal(r.elapsedHours), 68, 204);

    roundRect(ctx, 458, 128, W - 506, 118, 12);
    ctx.fillStyle = "rgba(240,180,41,0.1)";
    ctx.fill();
    ctx.fillStyle = "#8b9aab";
    ctx.font = "700 11px IBM Plex Sans, sans-serif";
    ctx.fillText("DOT SIGNIFICANT-DELAY LINE", 478, 154);
    ctx.fillStyle = "#f0b429";
    ctx.font = "600 42px IBM Plex Mono, monospace";
    ctx.fillText(r.thresholdHours + "h", 478, 204);
    ctx.fillStyle = "#8b9aab";
    ctx.font = "400 12px IBM Plex Sans, sans-serif";
    ctx.fillText(r.thresholdLabel, 478, 228);

    // Labeled bar
    const scaleMax = Math.max(r.thresholdHours, r.elapsedHours) * 1.05;
    const barX = 48;
    const barW = W - 96;
    const barY = 270;
    roundRect(ctx, barX, barY, barW, 18, 9);
    ctx.fillStyle = "#1a2430";
    ctx.fill();
    const fillW = Math.max(8, Math.min(barW, (r.elapsedHours / scaleMax) * barW));
    roundRect(ctx, barX, barY, fillW, 18, 9);
    ctx.fillStyle = r.past ? "#f07178" : "#5ec8c0";
    ctx.fill();
    const tickX = barX + (r.thresholdHours / scaleMax) * barW;
    ctx.fillStyle = "#e8eef4";
    ctx.fillRect(tickX - 1.5, barY - 4, 3, 26);
    ctx.fillStyle = "#8b9aab";
    ctx.font = "700 11px IBM Plex Mono, monospace";
    ctx.fillText("0h", barX, barY + 40);
    ctx.fillText("threshold " + r.thresholdHours + "h (labeled)", tickX - 70, barY + 40);
    ctx.fillText(hoursDecimal(r.elapsedHours) + " elapsed", barX + barW - 130, barY + 40);

    let pngFlag;
    if (r.statusKey === "file") {
      pngFlag = "PAST " + r.thresholdHours + "h · FILE MBR";
    } else if (r.past) {
      pngFlag = "PAST " + r.thresholdHours + "h · +" + hoursLabel(r.overHours);
    } else if (r.statusKey === "early") {
      pngFlag = "DELIVERED BEFORE " + r.thresholdHours + "h · " + hoursLabel(r.remainingHours) + " UNDER";
    } else {
      pngFlag = "NOT YET · " + hoursLabel(r.remainingHours) + " REMAIN TO " + r.thresholdHours + "h";
    }
    ctx.fillStyle =
      r.statusKey === "early" ? "#5ec8c0" : r.past ? "#f07178" : "#f0b429";
    ctx.font = "700 16px IBM Plex Sans, sans-serif";
    ctx.fillText(pngFlag, 48, barY + 62);

    // Chips
    function chip(x, y, text, color) {
      ctx.font = "700 12px IBM Plex Sans, sans-serif";
      const w = ctx.measureText(text).width + 24;
      roundRect(ctx, x, y, w, 28, 14);
      ctx.fillStyle = "rgba(26,36,48,0.9)";
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.fillText(text, x + 12, y + 18);
      return w + 10;
    }
    let cx = 48;
    const cy = 356;
    cx += chip(
      cx,
      cy,
      r.input.mbr ? "MBR: FILED · REQUIRED" : "MBR: NOT FILED · NOT AUTOMATIC",
      r.input.mbr ? "#3ecf8e" : "#f0b429"
    );
    if (r.input.feeKnown && Number.isFinite(r.fee)) {
      cx += chip(cx, cy, "BAG FEE " + money(r.fee), "#e8eef4");
    }
    chip(cx, cy, r.dueChip.toUpperCase(), r.pillClass === "due" ? "#3ecf8e" : r.pillClass === "file" ? "#f07178" : "#f0b429");

    roundRect(ctx, 48, 398, W - 96, 138, 12);
    ctx.fillStyle = "#121a24";
    ctx.fill();
    ctx.fillStyle = "#e8eef4";
    ctx.font = "600 15px IBM Plex Sans, sans-serif";
    ctx.fillText(r.dueText, 68, 424);
    ctx.fillStyle = "#c5d0da";
    ctx.font = "400 14px IBM Plex Sans, sans-serif";
    wrapText(ctx, r.plain, 68, 450, W - 136, 20, 4);

    ctx.fillStyle = "#f0b429";
    ctx.font = "600 13px IBM Plex Sans, sans-serif";
    ctx.fillText(
      "Not legal advice. Not a claim filer. File MBR with the airline — transportation.gov/refunds.",
      48,
      568
    );

    ctx.fillStyle = "#8b9aab";
    ctx.font = "400 12px IBM Plex Sans, sans-serif";
    ctx.fillText(
      "Public DOT Refunds + 14 CFR §260.5 · August 2026 ATCR mishandle context · Bag Delay Fee Refund Clock",
      48,
      H - 40
    );
    ctx.fillText(
      "Domestic 12h / intl 15h (flight ≤12h) / intl 30h (flight >12h). Threshold labeled in text.",
      48,
      H - 22
    );

    canvas.toBlob(function (blob) {
      if (!blob) {
        setStatus("PNG export failed.");
        return;
      }
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download =
        "bag-delay-fee-clock-" +
        (r.input.arriveDate || "card") +
        "-" +
        r.thresholdHours +
        "h.png";
      a.click();
      URL.revokeObjectURL(a.href);
      setStatus("PNG downloaded (share card — disclaimer on face, no form UI).");
    });
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderPresets() {
    const host = $("presets");
    host.innerHTML = "";
    SEEDS.forEach(function (seed) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "preset";
      btn.innerHTML = escapeHtml(seed.label) + '<span class="stage-tag">' + escapeHtml(seed.tag) + "</span>";
      btn.addEventListener("click", function () {
        document.querySelectorAll(".preset.active").forEach(function (el) {
          el.classList.remove("active");
        });
        btn.classList.add("active");
        applyInputs(seed);
        onClock();
        setStatus("Loaded labeled seed: " + seed.label + " (teaching scenario, not live airline data).");
      });
      host.appendChild(btn);
    });
  }

  function defaultDate() {
    const now = new Date();
    const p = zonedParts(now, "America/Chicago");
    return p.ymd;
  }

  function init() {
    if (!$("arriveDate").value) $("arriveDate").value = defaultDate();
    if (!$("asOfDate").value) $("asOfDate").value = defaultDate();
    if (!$("asOfTime").value) $("asOfTime").value = "16:00";
    syncFieldVisibility();
    renderPresets();
    $("clockBtn").addEventListener("click", onClock);
    $("shareBtn").addEventListener("click", onShare);
    $("copyBtn").addEventListener("click", onCopy);
    $("pngBtn").addEventListener("click", exportPng);
    $("clearBtn").addEventListener("click", clearAll);
    $("scope").addEventListener("change", syncFieldVisibility);
    $("bagStatus").addEventListener("change", syncFieldVisibility);

    [
      "arriveDate",
      "arriveTime",
      "tz",
      "scope",
      "intlDuration",
      "bagStatus",
      "endDate",
      "endTime",
      "asOfDate",
      "asOfTime",
      "mbr",
      "feePaid",
      "feeKnown",
      "noteLabel",
    ].forEach(function (id) {
      const el = $(id);
      el.addEventListener("change", function () {
        if (!$("cardSection").hidden) onClock();
      });
    });

    const decoded = decodeHash();
    if (decoded && decoded.arriveDate) {
      applyInputs(decoded);
      onClock();
      setStatus("Restored from share link.");
    }
  }

  const api = {
    CITES: CITES,
    SEEDS: SEEDS,
    thresholdHours: thresholdHours,
    thresholdText: thresholdText,
    computeClock: computeClock,
    localWallToUtc: localWallToUtc,
    hoursLabel: hoursLabel,
    CITE_ONE_LINER: CITE_ONE_LINER,
  };

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", init);
    } else {
      init();
    }
  }

  root.BagDelayFeeClock = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
