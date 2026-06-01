/**
 * Official government and university scholarship programmes outside US/UK Commonwealth hubs.
 * Each entry must be a single programme or dedicated application page (not a catalog homepage).
 */

const GLOBAL_OFFICIAL_SCRAPE_PROGRAMMES = [
  // —— Europe (national programmes) ——
  {
    externalId: "stipendium-hungaricum",
    url: "https://www.stipendiumhungaricum.hu/apply",
    organizationName: "Tempus Public Foundation — Hungary",
    country: "Hungary",
    degreeLevel: "bachelor",
    fieldOfStudy: "multiple disciplines",
    fundingType: "fully_funded",
    titleHint: "Stipendium Hungaricum Scholarship",
  },
  {
    externalId: "campus-france-eiffel",
    url: "https://www.campusfrance.org/en/eiffel-excellence-scholarship-program",
    organizationName: "Campus France",
    country: "France",
    degreeLevel: "master",
    fieldOfStudy: "multiple disciplines",
    fundingType: "fully_funded",
    titleHint: "Eiffel Excellence Scholarship Programme",
  },
  {
    externalId: "swiss-government-excellence",
    url: "https://www.sbfi.admin.ch/sbfi/en/home/education/scholarships-and-grants/swiss-government-excellence-scholarships.html",
    organizationName: "Swiss Government",
    country: "Switzerland",
    degreeLevel: "phd",
    fieldOfStudy: "research",
    fundingType: "fully_funded",
    titleHint: "Swiss Government Excellence Scholarships",
  },
  {
    externalId: "swedish-institute-scholarships",
    url: "https://si.se/en/apply/scholarships/",
    organizationName: "Swedish Institute",
    country: "Sweden",
    degreeLevel: "master",
    fieldOfStudy: "multiple disciplines",
    fundingType: "fully_funded",
    titleHint: "Swedish Institute Scholarships for Global Professionals",
  },
  {
    externalId: "holland-scholarship",
    url: "https://www.studyinholland.nl/finances/holland-scholarship",
    organizationName: "Dutch Ministry of Education",
    country: "Netherlands",
    degreeLevel: "bachelor",
    fieldOfStudy: "multiple disciplines",
    fundingType: "partially_funded",
    titleHint: "Holland Scholarship",
  },
  {
    externalId: "finnish-national-scholarships",
    url: "https://www.studyinfinland.fi/scholarships/finnish-national-agency-education-scholarship-programme",
    organizationName: "Finnish National Agency for Education",
    country: "Finland",
    degreeLevel: "master",
    fieldOfStudy: "multiple disciplines",
    fundingType: "fully_funded",
    titleHint: "Finnish National Scholarship Programme",
  },
  {
    externalId: "nawa-poland",
    url: "https://nawa.gov.pl/en/scholarships/foreign-students",
    organizationName: "NAWA — Poland",
    country: "Poland",
    degreeLevel: "master",
    fieldOfStudy: "multiple disciplines",
    fundingType: "fully_funded",
    titleHint: "NAWA Scholarships for Foreign Students",
  },
  {
    externalId: "czech-government-scholarships",
    url: "https://www.dzs.cz/en/article/study-in-the-czech-republic-government-scholarships",
    organizationName: "Government of the Czech Republic",
    country: "Czech Republic",
    degreeLevel: "master",
    fieldOfStudy: "multiple disciplines",
    fundingType: "fully_funded",
    titleHint: "Czech Government Scholarships",
  },
  {
    externalId: "maec-aecid-spain",
    url: "https://www.aecid.gob.es/en/programas-y-convocatorias/becas-y-ayudas",
    organizationName: "AECID — Spain",
    country: "Spain",
    degreeLevel: "master",
    fieldOfStudy: "development",
    fundingType: "fully_funded",
    titleHint: "MAEC-AECID Scholarships",
  },

  // —— Americas ——
  {
    externalId: "vanier-canada",
    url: "https://vanier.gc.ca/en/home-accueil.html",
    organizationName: "Government of Canada",
    country: "Canada",
    degreeLevel: "phd",
    fieldOfStudy: "research",
    fundingType: "fully_funded",
    titleHint: "Vanier Canada Graduate Scholarships",
  },
  {
    externalId: "oas-rowe-fund",
    url: "https://www.oas.org/en/rowe/",
    organizationName: "Organization of American States",
    country: "United States",
    degreeLevel: "bachelor",
    fieldOfStudy: "multiple disciplines",
    fundingType: "partially_funded",
    titleHint: "OAS Rowe Fund Student Loans",
  },
  {
    externalId: "anid-becas-chile",
    url: "https://www.anid.cl/becas-y-concursos/",
    organizationName: "ANID — Chile",
    country: "Chile",
    degreeLevel: "master",
    fieldOfStudy: "science and research",
    fundingType: "fully_funded",
    titleHint: "ANID Becas y Concursos",
  },
  {
    externalId: "italy-invest-your-talent",
    url: "https://www.studyinitaly.esteri.it/en/call-for-application",
    organizationName: "Italian Ministry of Foreign Affairs",
    country: "Italy",
    degreeLevel: "master",
    fieldOfStudy: "engineering and design",
    fundingType: "fully_funded",
    titleHint: "Invest Your Talent in Italy",
  },
  {
    externalId: "charpak-france",
    url: "https://www.campusfrance.org/en/charpak-scholarship-program",
    organizationName: "Campus France",
    country: "France",
    degreeLevel: "master",
    fieldOfStudy: "multiple disciplines",
    fundingType: "fully_funded",
    titleHint: "Charpak Scholarship Programme",
  },

  // —— Asia-Pacific ——
  {
    externalId: "lpdp-indonesia",
    url: "https://www.lpdp.kemenkeu.go.id/en/scholarship",
    organizationName: "LPDP — Indonesia",
    country: "Indonesia",
    degreeLevel: "master",
    fieldOfStudy: "multiple disciplines",
    fundingType: "fully_funded",
    titleHint: "LPDP Indonesia Scholarship",
  },
  {
    externalId: "iccr-india",
    url: "https://www.iccr.gov.in/index.php/scholarship/iccr-scholarships",
    organizationName: "Indian Council for Cultural Relations",
    country: "India",
    degreeLevel: "bachelor",
    fieldOfStudy: "multiple disciplines",
    fundingType: "fully_funded",
    titleHint: "ICCR Scholarship Scheme",
  },
  {
    externalId: "thailand-rtg-scholarship",
    url: "https://tica.thaigov.go.th/en/post/256",
    organizationName: "Thailand International Cooperation Agency",
    country: "Thailand",
    degreeLevel: "master",
    fieldOfStudy: "multiple disciplines",
    fundingType: "fully_funded",
    titleHint: "Royal Thai Government Scholarships",
  },
  {
    externalId: "world-bank-jjwbgsp",
    url: "https://www.worldbank.org/en/programs/scholarships/jj-wbgsp",
    organizationName: "World Bank",
    country: "United States",
    degreeLevel: "master",
    fieldOfStudy: "development studies",
    fundingType: "fully_funded",
    titleHint: "Joint Japan/World Bank Graduate Scholarship Program",
  },

  // —— Middle East ——
  {
    externalId: "king-abdullah-saudi",
    url: "https://www.kasp.etimad.sa/en/Pages/default.aspx",
    organizationName: "King Abdullah Scholarship Program — Saudi Arabia",
    country: "Saudi Arabia",
    degreeLevel: "master",
    fieldOfStudy: "multiple disciplines",
    fundingType: "fully_funded",
    titleHint: "King Abdullah Scholarship Program",
  },
  {
    externalId: "qatar-foundation-scholarships",
    url: "https://www.qf.org.qa/education/higher-education-scholarships",
    organizationName: "Qatar Foundation",
    country: "Qatar",
    degreeLevel: "master",
    fieldOfStudy: "multiple disciplines",
    fundingType: "fully_funded",
    titleHint: "Qatar Foundation Higher Education Scholarships",
  },

  // —— Africa (additional governments) ——
  {
    externalId: "philippines-ched-scholarships",
    url: "https://ched.gov.ph/scholarship-programs/",
    organizationName: "Commission on Higher Education — Philippines",
    country: "Philippines",
    degreeLevel: "bachelor",
    fieldOfStudy: "multiple disciplines",
    fundingType: "fully_funded",
    titleHint: "CHED Scholarship Programs",
  },
  {
    externalId: "mexico-conacyt",
    url: "https://www.conacyt.gob.mx/index.php/becas-y-posgrados",
    organizationName: "CONACYT — Mexico",
    country: "Mexico",
    degreeLevel: "phd",
    fieldOfStudy: "science and technology",
    fundingType: "fully_funded",
    titleHint: "CONACYT Scholarships and Graduate Support",
  },
  {
    externalId: "egypt-moe-scholarships",
    url: "https://www.mohesr.gov.eg/en/Pages/default.aspx",
    organizationName: "Ministry of Higher Education — Egypt",
    country: "Egypt",
    degreeLevel: "master",
    fieldOfStudy: "multiple disciplines",
    fundingType: "fully_funded",
    titleHint: "Egypt Ministry of Higher Education Scholarships",
  },
  {
    externalId: "aasciences-grants",
    url: "https://aasciences.africa/funding-opportunities",
    organizationName: "African Academy of Sciences",
    country: "Kenya",
    degreeLevel: "phd",
    fieldOfStudy: "science and research",
    fundingType: "fully_funded",
    titleHint: "African Academy of Sciences Funding Opportunities",
  },
  {
    externalId: "morocco-mesrsi",
    url: "https://www.enssup.gov.ma/en",
    organizationName: "Ministry of Higher Education — Morocco",
    country: "Morocco",
    degreeLevel: "master",
    fieldOfStudy: "multiple disciplines",
    fundingType: "fully_funded",
    titleHint: "Morocco Government Higher Education Scholarships",
  },
  {
    externalId: "uog-queens-mcf-graduate",
    url: "https://uogqueensmcf.com/how-to-apply/",
    organizationName: "University of Gondar & Queen's University — Mastercard Foundation Scholars Program",
    country: "Ethiopia",
    hostCountry: "Ethiopia",
    degreeLevel: "master",
    fieldOfStudy: "multiple disciplines",
    fundingType: "fully_funded",
    titleHint: "University of Gondar Mastercard Foundation Scholars Program (Graduate)",
  },
];

const GLOBAL_OFFICIAL_DESCRIPTIONS = {
  "stipendium-hungaricum":
    "Stipendium Hungaricum is the Hungarian government's scholarship programme for international students, offering full-degree study at Hungarian universities with tuition, stipend, and accommodation support for eligible applicants worldwide.",
  "campus-france-eiffel":
    "The Eiffel Excellence Scholarship Programme, managed by Campus France, funds outstanding international master's and PhD students to study in France at participating institutions in engineering, economics, law, and political science.",
  "swiss-government-excellence":
    "Swiss Government Excellence Scholarships support foreign researchers and artists for doctoral or postdoctoral study at Swiss cantonal universities, federal institutes of technology, and applied sciences universities.",
  "swedish-institute-scholarships":
    "Swedish Institute scholarships for global professionals fund master's studies in Sweden for citizens of selected countries, covering tuition, living expenses, travel, and insurance for development-focused fields.",
  "holland-scholarship":
    "The Holland Scholarship is financed by the Dutch Ministry of Education and participating universities, providing €5,000 for the first year of bachelor's or master's study for talented non-EEA students in the Netherlands.",
  "finnish-national-scholarships":
    "The Finnish National Agency for Education offers scholarship support for international students in Finnish higher education institutions, including tuition and living cost assistance for eligible degree programmes.",
  "nawa-poland":
    "NAWA scholarships for foreign students support study at Polish universities through government-funded programmes including Banach and Ulam scholarships and preparatory courses for international applicants.",
  "czech-government-scholarships":
    "Czech government scholarships, administered by the Ministry of Education and DZS, fund international students from developing countries for bachelor's, master's, and doctoral study at Czech public universities.",
  "maec-aecid-spain":
    "MAEC-AECID scholarships support students from partner countries to pursue postgraduate study and training in Spain, with a focus on development cooperation, public administration, and specialised master's programmes.",
  "vanier-canada":
    "Vanier Canada Graduate Scholarships recognize doctoral students who demonstrate leadership skills and high scholarly achievement in health, natural sciences, engineering, social sciences, or humanities at Canadian universities.",
  "oas-rowe-fund":
    "The OAS Rowe Fund offers interest-free student loans to citizens of Latin America and the Caribbean for undergraduate and graduate study at accredited universities in the Americas, with flexible repayment terms.",
  "anid-becas-chile":
    "ANID (National Agency for Research and Development) administers Becas Chile and related calls for postgraduate study, research stays, and innovation programmes for Chilean and international researchers.",
  "italy-invest-your-talent":
    "Invest Your Talent in Italy supports international students in engineering, advanced technologies, architecture, design, and economics at Italian universities with tuition waivers and career services.",
  "charpak-france":
    "The Charpak Scholarship Programme offers Indian students funding for bachelor's, master's, exchange, and research study in France through Campus France with tuition and living support.",
  "lpdp-indonesia":
    "LPDP (Indonesia Endowment Fund for Education) scholarships fund outstanding Indonesian and, in select calls, international candidates for master's and doctoral study at top domestic and overseas universities.",
  "iccr-india":
    "ICCR scholarships offer international students from partner countries the opportunity to pursue undergraduate, postgraduate, and research study in India with tuition, accommodation, and living allowance support.",
  "thailand-rtg-scholarship":
    "Royal Thai Government scholarships, administered by TICA, support citizens of developing countries for postgraduate study in Thailand in fields aligned with Thailand's technical cooperation and development priorities.",
  "world-bank-jjwbgsp":
    "The Joint Japan/World Bank Graduate Scholarship Program (JJ/WBGSP) sponsors mid-career professionals from World Bank member countries for development-related master's degrees at universities worldwide.",
  "king-abdullah-saudi":
    "The King Abdullah Scholarship Program (KASP) supports Saudi citizens and, in defined tracks, international partnership pathways for higher education study in priority disciplines at approved universities.",
  "qatar-foundation-scholarships":
    "Qatar Foundation higher education scholarships support talented students for study at branch campuses and partner institutions in Education City, covering tuition and living costs for undergraduate and graduate programmes.",
  "philippines-ched-scholarships":
    "CHED scholarship programmes support Filipino students through national merit awards, grants-in-aid, and study-abroad placements aligned with Philippine higher education priorities.",
  "mexico-conacyt":
    "CONACYT scholarships and graduate support fund Mexican students and researchers for science, technology, and innovation study at national and international institutions.",
  "egypt-moe-scholarships":
    "Egypt's Ministry of Higher Education and Scientific Research administers public university placement, joint supervision programmes, and government scholarships for Egyptian students studying abroad.",
  "aasciences-grants":
    "The African Academy of Sciences funding opportunities support early-career and established African researchers through grants, fellowships, and partnership programmes in health and STEM.",
  "morocco-mesrsi":
    "Morocco's Ministry of Higher Education, Scientific Research and Innovation coordinates national scholarships, university reform, and international cooperation awards for Moroccan and partner-country students.",
  "uog-queens-mcf-graduate":
    "The Mastercard Foundation Scholars Program at the University of Gondar (in partnership with Queen's University, Canada) awards fully funded graduate scholarships for academically talented, disadvantaged students from East Africa. " +
    "Eligible applicants are citizens and long-term residents of Ethiopia, Somalia, Eritrea, Djibouti, or South Sudan who hold a relevant bachelor's degree (minimum CGPA 2.75 on a 4.0 scale, English-medium instruction within the past five years), including youth with disabilities and women facing financial barriers. " +
    "Scholarships cover tuition, accommodation, stipend, books, and leadership development. Study programmes include public health, nursing, law, management, economics, psychology, special needs education, optometry, physiotherapy, and related fields at the University of Gondar. " +
    "Apply online or submit the paper application with required documents to uogqueensmcf@gmail.com or mcfsp.uog@gmail.com per current instructions on the official programme site. Check uogqueensmcf.com for opening and closing dates each cycle.",
};

module.exports = {
  GLOBAL_OFFICIAL_SCRAPE_PROGRAMMES,
  GLOBAL_OFFICIAL_DESCRIPTIONS,
};
