export type Language = "en" | "hi";
export type Expiry = {
  raw: string;
  display: string;
  status: "expired" | "future" | "unverified";
  end?: string;
};
export type Medicine = {
  name?: string;
  strength?: string;
  manufacturer?: string;
  batch?: string;
  expiry?: Expiry;
  text: string;
};
const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const hindiMonths = [
  "जनवरी",
  "फ़रवरी",
  "मार्च",
  "अप्रैल",
  "मई",
  "जून",
  "जुलाई",
  "अगस्त",
  "सितंबर",
  "अक्टूबर",
  "नवंबर",
  "दिसंबर",
];

export function parseExpiry(
  text: string,
  now = new Date(),
): Expiry | undefined {
  const matches = [
    ...text.matchAll(
      /\b(?:EXP(?:IRY|IRES|IRATION)?(?:[ \t]+DATE)?|USE[ \t]+BEFORE|BEST[ \t]+BEFORE)\b[ \t]*[:.\-]?[ \t]*([^\n\r]*)/gi,
    ),
  ];
  if (!matches.length) return undefined;
  const values = [...new Set(matches.map((m) => m[1].trim()))];
  const raw = values.join(" / ").slice(0, 100) || "Unreadable expiry";
  if (values.length > 1 || /[?]|\bor\b/i.test(raw))
    return { raw, display: raw, status: "unverified" };
  let month = 0,
    year = 0;
  const numeric = raw.match(/^(\d{1,2})[ \t]*[\/.-][ \t]*(\d{4})(?=$|[ \t,;])/);
  const named = raw.match(/^([A-Za-z]+)[ \t\/.-]+(\d{4})(?=$|[ \t,;])/);
  if (numeric) {
    month = Number(numeric[1]);
    year = Number(numeric[2]);
  } else if (named) {
    month =
      months.findIndex(
        (m) =>
          m.toLowerCase().startsWith(named[1].toLowerCase()) &&
          named[1].length >= 3,
      ) + 1;
    year = Number(named[2]);
  }
  if (month < 1 || month > 12 || year < 1900 || year > 2199)
    return { raw, display: raw, status: "unverified" };
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);
  return {
    raw,
    display: `${months[month - 1]} ${year}`,
    status: now > endDate ? "expired" : "future",
    end: `${year}-${String(month).padStart(2, "0")}`,
  };
}

export function parseLabel(input: string, now = new Date()): Medicine {
  const text = input.trim();
  const known = text.match(
    /\b(paracetamol|acetaminophen|ibuprofen|amoxicillin|cetirizine|metformin|aspirin|azithromycin|omeprazole|pantoprazole|atorvastatin)\b/i,
  );
  const explicit = text.match(
    /^(?:medicine(?:[ \t]+name)?|product(?:[ \t]+name)?)[ \t]*:[ \t]*([A-Za-z][A-Za-z0-9 ()-]{2,55})[ \t]*$/im,
  );
  const clean = (v?: string) =>
    v &&
    !/^(?:unknown|unreadable|unclear|missing|not[ \t]+(?:detected|legible|readable)|n\/a)\b/i.test(
      v,
    )
      ? v
      : undefined;
  const name = known?.[1] ?? clean(explicit?.[1]);
  const manufacturer = clean(
    text
      .match(
        /^(?:manufactured[ \t]+by|manufacturer|mfg\.?[ \t]*by|marketed[ \t]+by)[ \t]*[:.\-]?[ \t]*([A-Za-z0-9][^\r\n]*)$/im,
      )?.[1]
      ?.trim(),
  );
  const batch = clean(
    text.match(
      /\b(?:batch(?:[ \t]*(?:no\.?|number))?|b\.?[ \t]*no\.?)[ \t]*[:#.-]?[ \t]*(?!no\b|number\b)([A-Z0-9][A-Z0-9\/-]{1,30})/i,
    )?.[1],
  );
  const strength = text.match(
    /\b\d+(?:\.\d+)?\s*(?:mg|mcg|µg|g|ml|IU)\b/i,
  )?.[0];
  return {
    name: name
      ? name.charAt(0).toUpperCase() + name.slice(1).toLowerCase()
      : undefined,
    strength,
    manufacturer,
    batch,
    expiry: parseExpiry(text, now),
    text,
  };
}

export function explanation(r: Medicine, language: Language): string {
  if (language === "hi") {
    const parts = [
      r.name
        ? `लेबल में संभावित दवा का नाम ${r.name} पढ़ा गया है। मूल पैकेजिंग से इसकी पुष्टि करें।`
        : "दवा का नाम भरोसे के साथ पहचाना नहीं जा सका। मूल लेबल जाँचें या फार्मासिस्ट से मदद लें।",
    ];
    if (r.strength)
      parts.push(
        `लेबल पर लिखी ताकत ${r.strength} है। यह खुराक लेने की सलाह नहीं है।`,
      );
    if (r.manufacturer) parts.push(`लेबल पर निर्माता: ${r.manufacturer}।`);
    if (r.batch) parts.push(`बैच नंबर: ${r.batch}।`);
    if (r.expiry) {
      const e = r.expiry;
      const date = e.end
        ? `${hindiMonths[Number(e.end.slice(5)) - 1]} ${e.end.slice(0, 4)}`
        : e.raw;
      parts.push(
        e.status === "unverified"
          ? `समाप्ति तिथि ${date} स्पष्ट नहीं है। इसकी पुष्टि नहीं हुई है।`
          : `लेबल की समाप्ति तिथि ${date} पढ़ी गई है। ${e.status === "expired" ? "यह तिथि बीत चुकी लगती है।" : "यह तिथि अभी नहीं बीती है। इससे दवा की सुरक्षा की पुष्टि नहीं होती।"} मूल पैकेजिंग से जाँच करें।`,
      );
    } else parts.push("समाप्ति तिथि नहीं मिली। मूल पैकेजिंग की जाँच करें।");
    parts.push(
      "MediRead केवल लेबल पढ़ने में मदद करता है। टेक्स्ट पहचान में गलतियाँ हो सकती हैं। दवा और खुराक के फैसले डॉक्टर या फार्मासिस्ट से करें।",
    );
    return parts.join(" ");
  }
  const parts = [
    r.name
      ? `The label appears to say ${r.name}. Verify this possible medicine name against the original packaging.`
      : "The medicine could not be confidently identified. Check the original label or ask a pharmacist to help read it.",
  ];
  if (r.strength)
    parts.push(
      `The printed strength is ${r.strength}. This describes the label, not a recommended dose.`,
    );
  if (r.manufacturer)
    parts.push(`Manufacturer printed on the label: ${r.manufacturer}.`);
  if (r.batch) parts.push(`Printed batch number: ${r.batch}.`);
  if (r.expiry)
    parts.push(
      r.expiry.status === "unverified"
        ? `The expiry text "${r.expiry.raw}" could not be interpreted reliably. Verify the date on the packaging.`
        : `The label's expiry appears to be ${r.expiry.display}. ${r.expiry.status === "expired" ? "This date appears to have passed." : "This date has not passed; that does not confirm medicine safety."} Verify it on the original packaging.`,
    );
  else
    parts.push(
      "No explicit expiry date was found. Check the original packaging.",
    );
  parts.push(
    "OCR can make mistakes. Consult a doctor or pharmacist for medicine and dosage decisions.",
  );
  return parts.join(" ");
}
export const samples = [
  {
    id: "readable",
    title: "Readable label",
    hi: "स्पष्ट लेबल",
    text: "PARACETAMOL TABLETS IP\n500 mg\nManufactured by: Example Pharma (sample manufacturer)\nBatch No: DEMO2401\nEXP: 08/2028\nSAMPLE LABEL — FOR DEMONSTRATION ONLY",
  },
  {
    id: "unclear",
    title: "Unclear label",
    hi: "अस्पष्ट लेबल",
    text: "P?R... TABLETS\nStrength: unreadable\nEXP: ??/20??\nSAMPLE LABEL — FOR DEMONSTRATION ONLY",
  },
  {
    id: "expired",
    title: "Past expiry date",
    hi: "बीती समाप्ति तिथि",
    text: "CETIRIZINE TABLETS\n10 mg\nBatch No: DEMO2203\nEXP: January 2024\nSAMPLE LABEL — FOR DEMONSTRATION ONLY",
  },
];
