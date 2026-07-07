import dotenv from "dotenv";
dotenv.config();

const localKnowledgeBase = {
  en: [
    {
      keywords: ["service", "what do you do", "offer", "provide", "capabilities"],
      response: "Snortweb Technology specializes in secure web development, comprehensive cybersecurity audits & pentesting, zero-trust cloud architectures, and premium UI/UX design. We build blazing-fast React interfaces embedded with defense-grade cybersecurity."
    },
    {
      keywords: ["project", "portfolio", "work", "packzivo", "reyansh"],
      response: "Our featured portfolio includes: 1) Packzivo Packaging (a live, fully-secured custom bulk packaging builder & supply chain tracker), 2) Hotel Reyansh Pride (dine-in cafe analytics, coming soon), and 3) Reyansh Heights Real Estate (coming soon). All projects are built with military-grade logging."
    },
    {
      keywords: ["security", "safe", "hack", "penetration", "cyber", "audit"],
      response: "Security is built into our DNA. We implement military-grade penetration logging, secure HTTP headers, zero-trust backend authorization, and regular vulnerability scanning so that your digital assets are unbreakable."
    },
    {
      keywords: ["contact", "hire", "pricing", "cost", "get in touch", "inquiry"],
      response: "You can submit an inquiry through our Contact page, or click the Reply button in the admin console to email us. We typically get back to clients within 24 hours with custom quotes."
    },
    {
      keywords: ["hi", "hello", "hey", "greetings"],
      response: "Hello! I am the Snortweb AI assistant. How can I help you today? You can ask me about our secure web development services, recent projects, or cybersecurity audits."
    }
  ],
  hi: [
    {
      keywords: ["सेवा", "काम", "सर्विस", "ऑफर", "प्रदान"],
      response: "स्नोर्टवेब टेक्नोलॉजी मुख्य रूप से सुरक्षित वेब डेवलपमेंट, व्यापक साइबर सुरक्षा ऑडिट और पेनेट्रेशन टेस्टिंग, क्लाउड आर्किटेक्चर और प्रीमियम यूआई/यूएक्स डिज़ाइन में विशेषज्ञता रखती है। हम अत्याधुनिक साइबर सुरक्षा से लैस तेज़ रिएक्ट इंटरफेस बनाते हैं।"
    },
    {
      keywords: ["प्रोजेक्ट", "पोर्टफोलियो", "पैकजीवो", "रेयांश", "काम"],
      response: "हमारे मुख्य प्रोजेक्ट्स में शामिल हैं: १) पैकजीवो पैकेजिंग (लाइव और पूरी तरह सुरक्षित पैकेजिंग बिल्डर और ट्रैकर), २) होटल रेयांश प्राइड (कैफे एनालिटिक्स, जल्द आ रहा है), और ३) रेयांश हाइट्स रियल एस्टेट (जल्द आ रहा है)।"
    },
    {
      keywords: ["सुरक्षा", "सेफ", "हैक", "साइबर", "ऑडिट"],
      response: "सुरक्षा हमारे काम के हर हिस्से में है। हम मिलिट्री-ग्रेड पेनेट्रेशन लॉगिंग, सुरक्षित HTTP हेडर्स, ज़ीरो-ट्रस्ट बैकएंड ऑथराइजेशन और नियमित कमियों की जांच करते हैं ताकि आपकी डिजिटल संपत्तियां अटूट रहें।"
    },
    {
      keywords: ["संपर्क", "हायर", "कीमत", "कांटेक्ट", "पूछताछ"],
      response: "आप हमारे संपर्क (Contact) पृष्ठ के माध्यम से पूछताछ सबमिट कर सकते हैं। हमारी टीम आमतौर पर २४ घंटे के भीतर आपसे संपर्क करेगी।"
    },
    {
      keywords: ["नमस्ते", "हेलो", "हाय", "नमस्कार"],
      response: "नमस्ते! मैं स्नोर्टवेब एआई सहायक हूँ। आज मैं आपकी क्या मदद कर सकता हूँ? आप हमारी सुरक्षित वेब विकास सेवाओं, हाल के प्रोजेक्ट्स या सुरक्षा ऑडिट के बारे में पूछ सकते हैं।"
    }
  ],
  hinglish: [
    {
      keywords: ["kya", "kaam", "service", "banate", "offer", "sakte", "karti"],
      response: "Snortweb Technology secure web development, cyber security audits aur premium UI/UX design mein expert hai. Hum blazing-fast React interfaces banate hain jo cyber attacks se fully protected hote hain."
    },
    {
      keywords: ["project", "portfolio", "packzivo", "reyansh"],
      response: "Hamare main projects hain: 1) Packzivo Packaging (live custom packaging builder), 2) Hotel Reyansh Pride (cafe analytics), aur 3) Reyansh Heights Real Estate. Sabhi projects military-grade security ke sath banaye gaye hain."
    },
    {
      keywords: ["security", "safe", "hack", "cyber", "audit"],
      response: "Security hamari top priority hai. Hum zero-trust backend, secure HTTP headers aur regular vulnerability scanning use karte hain taaki aapka data 100% safe rahe."
    },
    {
      keywords: ["contact", "hire", "price", "paise", "kaise", "baat"],
      response: "Aap hamare Contact page ke through inquiry bhej sakte hain. Hamari team 24 ghante ke andar aapse contact karegi custom quote ke sath."
    },
    {
      keywords: ["hi", "hello", "hey", "namaste", "kaise ho", "haal"],
      response: "Hello! Main Snortweb AI assistant hoon. Main aaj aapki kaise madad kar sakta hoon? Aap hamari services, projects ya security audits ke baare mein pooch sakte hain."
    }
  ]
};

// Default fallback replies if keywords don't match
const defaultReplies = {
  en: "I'm here to help with questions about Snortweb Technology's services, cybersecurity audits, or projects like Packzivo Packaging. Please feel free to ask or contact our team directly!",
  hi: "मैं स्नोर्टवेब टेक्नोलॉजी की सेवाओं, साइबर सुरक्षा ऑडिट, या पैकजीवो पैकेजिंग जैसे प्रोजेक्ट्स के बारे में आपके प्रश्नों का उत्तर दे सकता हूँ। कृपया बेझिझक पूछें या हमारी टीम से संपर्क करें!",
  hinglish: "Main Snortweb Technology ki services, projects aur cybersecurity ke baare mein aapke sawalon ka jawab de sakta hoon. Aap bejhijhak kuch bhi pooch sakte hain!"
};

export const handleChat = async (req, res) => {
  const { message, language } = req.body;
  const currentLang = language === "hi" ? "hi" : "en";

  if (!message || String(message).trim() === "") {
    return res.status(400).json({ error: "Message is required" });
  }

  const cleanMessage = String(message).trim();

  // Validate input constraints to prevent DoS/Overflows
  if (cleanMessage.length > 1000) {
    return res.status(400).json({ error: "Message is too long. Limit is 1000 characters." });
  }

  if (language !== undefined && language !== "en" && language !== "hi") {
    return res.status(400).json({ error: "Unsupported language parameter." });
  }

  const geminiKey = process.env.GEMINI_API_KEY;

  if (geminiKey) {
    try {
      // Connect to Google Gemini API (SSRF Safe URL)
      const targetApiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";
      
      const systemPrompt = `You are Snortweb AI Assistant, a friendly and professional cybersecurity and web development expert assistant for Snortweb Technology.
Snortweb Technology specializes in building ultra-premium, blazing-fast React and Node.js digital interfaces embedded with defense-grade cybersecurity, penetration logging, and zero-trust architectures.
Key details about Snortweb:
- Services: Secure Web Development, Cyber Security Audits & Pentesting, Custom Cloud Architectures, Secure UI/UX Design.
- Projects: Packzivo Packaging (custom bulk packaging builder & supply chain logistics tracker, fully live and secured), Hotel Reyansh Pride (dine-in order analytics and cafe dashboard, coming soon), Reyansh Heights (real estate architectural showcase, coming soon).
- Pricing/Inquiries: Users can submit inquiries through the contact form, and the team will get in touch within 24 hours.
CRITICAL INSTRUCTION: Analyze the language of the User Message. If the user writes in Hinglish (Hindi written in English alphabet), you MUST reply in Hinglish. If they write in pure Hindi (Devanagari script), reply in Hindi. If they write in English, reply in English. Keep responses concise, helpful, and professional (under 3 sentences).`;

      const response = await fetch(
        `${targetApiUrl}?key=${encodeURIComponent(geminiKey)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [
                  { text: systemPrompt },
                  { text: `User Message: ${cleanMessage}` }
                ]
              }
            ],
            generationConfig: {
              maxOutputTokens: 150,
              temperature: 0.7
            }
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (aiResponse) {
          return res.json({ reply: aiResponse.trim() });
        }
      } else {
        console.warn("[CHAT AI HTTP ERROR] Gemini API returned status:", response.status);
      }
    } catch (error) {
      console.warn("[CHAT AI ERROR] Falling back to local knowledge base:", error.message);
    }
  }

  // Local knowledge base fallback
  const lowercaseMsg = cleanMessage.toLowerCase();
  
  // Basic language detection
  let detectedLang = currentLang;
  if (/[\u0900-\u097F]/.test(cleanMessage)) {
    detectedLang = "hi";
  } else if (/\b(kya|kaise|hoon|hai|kar|aap|hain|karti|sakte|tum|hum|mujhe|toh)\b/i.test(lowercaseMsg)) {
    detectedLang = "hinglish";
  } else {
    detectedLang = "en";
  }

  const db = localKnowledgeBase[detectedLang] || localKnowledgeBase.en;
  let matchedReply = null;

  for (const item of db) {
    const matchesKeyword = item.keywords.some((kw) => lowercaseMsg.includes(kw));
    if (matchesKeyword) {
      matchedReply = item.response;
      break;
    }
  }

  // Cross-language keyword fallback check
  if (!matchedReply) {
    const alternativeLangs = ["en", "hi", "hinglish"].filter(l => l !== detectedLang);
    for (const altLang of alternativeLangs) {
      const alternativeDb = localKnowledgeBase[altLang];
      for (const item of alternativeDb) {
        const matchesKeyword = item.keywords.some((kw) => lowercaseMsg.includes(kw));
        if (matchesKeyword) {
          const topicIndex = alternativeDb.indexOf(item);
          matchedReply = db[topicIndex]?.response;
          break;
        }
      }
      if (matchedReply) break;
    }
  }

  const reply = matchedReply || defaultReplies[detectedLang] || defaultReplies.en;
  return res.json({ reply });
};
