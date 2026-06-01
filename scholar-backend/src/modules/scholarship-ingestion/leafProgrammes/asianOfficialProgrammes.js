/**
 * Official Asian government and university scholarship programmes (leaf apply URLs).
 */

const ASIAN_OFFICIAL_SCRAPE_PROGRAMMES = [
  // —— East Asia ——
  {
    externalId: "japan-mext-embassy",
    url: "https://www.studyinjapan.go.jp/en/planning/scholarship/types/mext/",
    organizationName: "MEXT — Japan",
    country: "Japan",
    degreeLevel: "master",
    fieldOfStudy: "multiple disciplines",
    fundingType: "fully_funded",
    titleHint: "MEXT Scholarship (Embassy Recommendation)",
  },
  {
    externalId: "japan-jica-young-leaders",
    url: "https://www.jica.go.jp/english/activities/scheme/personal/procedures/government.html",
    organizationName: "JICA — Japan",
    country: "Japan",
    degreeLevel: "master",
    fieldOfStudy: "development",
    fundingType: "fully_funded",
    titleHint: "JICA Development Studies Programme",
  },
  {
    externalId: "korea-gks-graduate",
    url: "https://www.studyinkorea.go.kr/en/uss/uss2/uss1050/uss1050_02.do",
    organizationName: "National Institute for International Education — Korea",
    country: "South Korea",
    degreeLevel: "master",
    fieldOfStudy: "multiple disciplines",
    fundingType: "fully_funded",
    titleHint: "Global Korea Scholarship (GKS-G)",
  },
  {
    externalId: "china-csc-government",
    url: "https://studyinchina.csc.edu.cn/",
    organizationName: "China Scholarship Council",
    country: "China",
    degreeLevel: "master",
    fieldOfStudy: "multiple disciplines",
    fundingType: "fully_funded",
    titleHint: "Chinese Government Scholarship (CSC)",
  },
  {
    externalId: "taiwan-scholarship-moe",
    url: "https://www.studyintaiwan.org/scholarships/taiwan-scholarship",
    organizationName: "Ministry of Education — Taiwan",
    country: "Taiwan",
    degreeLevel: "master",
    fieldOfStudy: "multiple disciplines",
    fundingType: "fully_funded",
    titleHint: "Taiwan Scholarship (MOE)",
  },
  {
    externalId: "taiwan-icdf-scholarship",
    url: "https://www.icdf.org.tw/ct.asp?xItem=12505&CtNode=30966",
    organizationName: "Taiwan ICDF",
    country: "Taiwan",
    degreeLevel: "master",
    fieldOfStudy: "development",
    fundingType: "fully_funded",
    titleHint: "Taiwan ICDF International Higher Education Scholarship",
  },
  {
    externalId: "hong-kong-phd-fellowship",
    url: "https://cerg1.ugc.edu.hk/hkpfs/index.html",
    organizationName: "Research Grants Council — Hong Kong",
    country: "Hong Kong",
    degreeLevel: "phd",
    fieldOfStudy: "research",
    fundingType: "fully_funded",
    titleHint: "Hong Kong PhD Fellowship Scheme (HKPFS)",
  },
  {
    externalId: "singapore-asean-scholarships",
    url: "https://www.moe.gov.sg/financial-matters/awards-scholarships/asean-scholarships",
    organizationName: "Ministry of Education — Singapore",
    country: "Singapore",
    degreeLevel: "bachelor",
    fieldOfStudy: "multiple disciplines",
    fundingType: "fully_funded",
    titleHint: "ASEAN Scholarships (Singapore)",
  },
  {
    externalId: "singapore-singa-award",
    url: "https://www.a-star.edu.sg/Scholarships/for-graduate-studies/singapore-international-graduate-award-singa",
    organizationName: "A*STAR — Singapore",
    country: "Singapore",
    degreeLevel: "phd",
    fieldOfStudy: "science and engineering",
    fundingType: "fully_funded",
    titleHint: "Singapore International Graduate Award (SINGA)",
  },

  // —— Southeast Asia ——
  {
    externalId: "indonesia-darmasiswa",
    url: "https://darmasiswa.kemendikbud.go.id/en/",
    organizationName: "Ministry of Education — Indonesia",
    country: "Indonesia",
    degreeLevel: "bachelor",
    fieldOfStudy: "language and culture",
    fundingType: "fully_funded",
    titleHint: "Darmasiswa Scholarship — Indonesia",
  },
  {
    externalId: "malaysia-mis",
    url: "https://biasiswa.mohe.gov.my/INTER/index.php",
    organizationName: "Ministry of Higher Education — Malaysia",
    country: "Malaysia",
    degreeLevel: "master",
    fieldOfStudy: "multiple disciplines",
    fundingType: "fully_funded",
    titleHint: "Malaysia International Scholarship (MIS)",
  },
  {
    externalId: "malaysia-mtcp",
    url: "https://www.kln.gov.my/web/guest/mtcp",
    organizationName: "Ministry of Foreign Affairs — Malaysia",
    country: "Malaysia",
    degreeLevel: "master",
    fieldOfStudy: "diplomacy and development",
    fundingType: "fully_funded",
    titleHint: "Malaysian Technical Cooperation Programme (MTCP)",
  },
  {
    externalId: "malaysia-mara-biasiswa",
    url: "https://www.mara.gov.my/en/pengajian-tinggi-perolehan-kerja/biasiswa-pinjaman/",
    organizationName: "MARA — Malaysia",
    country: "Malaysia",
    degreeLevel: "bachelor",
    fieldOfStudy: "multiple disciplines",
    fundingType: "fully_funded",
    titleHint: "MARA Scholarships and Loans",
  },
  {
    externalId: "thailand-tipp",
    url: "https://tica.thaigov.go.th/en/post/255",
    organizationName: "Thailand International Cooperation Agency",
    country: "Thailand",
    degreeLevel: "master",
    fieldOfStudy: "development",
    fundingType: "fully_funded",
    titleHint: "Thailand International Postgraduate Programme (TIPP)",
  },
  {
    externalId: "philippines-dost-sei",
    url: "https://www.dost.gov.ph/index.php/programs-and-projects/scholarship-programs.html",
    organizationName: "Department of Science and Technology — Philippines",
    country: "Philippines",
    degreeLevel: "master",
    fieldOfStudy: "science and technology",
    fundingType: "fully_funded",
    titleHint: "DOST-SEI Scholarship Programs",
  },
  {
    externalId: "brunei-bdgs",
    url: "https://www.mfa.gov.bn/pages/bdgs/bdgs2024.aspx",
    organizationName: "Ministry of Foreign Affairs — Brunei",
    country: "Brunei",
    degreeLevel: "bachelor",
    fieldOfStudy: "multiple disciplines",
    fundingType: "fully_funded",
    titleHint: "Brunei Darussalam Government Scholarship",
  },
  {
    externalId: "brunei-ubd-graduate",
    url: "https://ubd.edu.bn/admission/graduate-scholarship/",
    organizationName: "University of Brunei Darussalam",
    country: "Brunei",
    degreeLevel: "phd",
    fieldOfStudy: "research",
    fundingType: "fully_funded",
    titleHint: "UBD Graduate Scholarship",
  },

  // —— South Asia ——
  {
    externalId: "india-nsp-scholarships",
    url: "https://www.india.gov.in/spotlight/national-scholarship-portal-nsp",
    organizationName: "Government of India",
    country: "India",
    degreeLevel: "bachelor",
    fieldOfStudy: "multiple disciplines",
    fundingType: "partially_funded",
    titleHint: "National Scholarship Portal — India",
  },
  {
    externalId: "pakistan-hec-foreign",
    url: "https://www.hec.gov.pk/english/scholarshipsgrants/Pages/Foreign-Scholarships.aspx",
    organizationName: "Higher Education Commission — Pakistan",
    country: "Pakistan",
    degreeLevel: "master",
    fieldOfStudy: "multiple disciplines",
    fundingType: "fully_funded",
    titleHint: "HEC Foreign Scholarships — Pakistan",
  },
  {
    externalId: "nepal-moe-scholarships",
    url: "https://moe.gov.np/en/scholarship",
    organizationName: "Ministry of Education — Nepal",
    country: "Nepal",
    degreeLevel: "bachelor",
    fieldOfStudy: "multiple disciplines",
    fundingType: "fully_funded",
    titleHint: "Nepal Ministry of Education Scholarships",
  },
  {
    externalId: "sri-lanka-mohe-scholarships",
    url: "https://www.mohe.gov.lk/index.php/scholarships",
    organizationName: "Ministry of Higher Education — Sri Lanka",
    country: "Sri Lanka",
    degreeLevel: "master",
    fieldOfStudy: "multiple disciplines",
    fundingType: "fully_funded",
    titleHint: "Sri Lanka Ministry of Higher Education Scholarships",
  },

  // —— Central Asia ——
  {
    externalId: "kazakhstan-bolashak",
    url: "https://bolashak.gov.kz/en/",
    organizationName: "Bolashak Programme — Kazakhstan",
    country: "Kazakhstan",
    degreeLevel: "master",
    fieldOfStudy: "multiple disciplines",
    fundingType: "fully_funded",
    titleHint: "Bolashak International Scholarship",
  },
  {
    externalId: "uzbekistan-elyurt-umidi",
    url: "https://www.edu.uz/en/pages/oliy_talim_vazirligi_stipendiyalari",
    organizationName: "Ministry of Higher Education — Uzbekistan",
    country: "Uzbekistan",
    degreeLevel: "master",
    fieldOfStudy: "multiple disciplines",
    fundingType: "fully_funded",
    titleHint: "El-Yurt Umidi Presidential Scholarship",
  },

  // —— Major Asian universities (international awards) ——
  {
    externalId: "japan-kyoto-iuop",
    url: "https://www.iop.kyoto-u.ac.jp/english/admissions/financial_support/",
    organizationName: "Kyoto University",
    country: "Japan",
    degreeLevel: "master",
    fieldOfStudy: "research",
    fundingType: "fully_funded",
    titleHint: "Kyoto University International Undergraduate Program Scholarships",
  },
  {
    externalId: "korea-kaist-intl-undergrad",
    url: "https://admission.kaist.ac.kr/intl-undergraduate/",
    organizationName: "KAIST",
    country: "South Korea",
    degreeLevel: "bachelor",
    fieldOfStudy: "STEM",
    fundingType: "fully_funded",
    titleHint: "KAIST International Student Scholarship",
  },
  {
    externalId: "korea-snu-global",
    url: "https://en.snu.ac.kr/admission/scholarships",
    organizationName: "Seoul National University",
    country: "South Korea",
    degreeLevel: "master",
    fieldOfStudy: "multiple disciplines",
    fundingType: "fully_funded",
    titleHint: "Seoul National University Global Scholarship",
  },
  {
    externalId: "china-peking-csc",
    url: "https://isd.pku.edu.cn/Scholarship/Chinese_Government_Scholarship.htm",
    organizationName: "Peking University",
    country: "China",
    degreeLevel: "master",
    fieldOfStudy: "multiple disciplines",
    fundingType: "fully_funded",
    titleHint: "Peking University Chinese Government Scholarship",
  },
  {
    externalId: "china-tsinghua-intl-grad",
    url: "https://www.tsinghua.edu.cn/en/Admissions/International_Students/Scholarships.htm",
    organizationName: "Tsinghua University",
    country: "China",
    degreeLevel: "master",
    fieldOfStudy: "multiple disciplines",
    fundingType: "fully_funded",
    titleHint: "Tsinghua University International Graduate Scholarship",
  },
  {
    externalId: "singapore-nus-research",
    url: "https://nusgs.nus.edu.sg/scholarships/nus-research-scholarship/",
    organizationName: "National University of Singapore",
    country: "Singapore",
    degreeLevel: "phd",
    fieldOfStudy: "research",
    fundingType: "fully_funded",
    titleHint: "NUS Research Scholarship",
  },
  {
    externalId: "singapore-ntu-research",
    url: "https://www.ntu.edu.sg/admissions/graduate/financial-matters/scholarships/ntu-research-scholarship",
    organizationName: "Nanyang Technological University",
    country: "Singapore",
    degreeLevel: "phd",
    fieldOfStudy: "research",
    fundingType: "fully_funded",
    titleHint: "NTU Research Scholarship",
  },
  {
    externalId: "hong-kong-hkust-redbird",
    url: "https://pg.ust.hk/admissions/scholarships-and-financial-aid",
    organizationName: "Hong Kong University of Science and Technology",
    country: "Hong Kong",
    degreeLevel: "phd",
    fieldOfStudy: "research",
    fundingType: "fully_funded",
    titleHint: "HKUST RedBird PhD Scholarship",
  },
  {
    externalId: "japan-jasso-honors",
    url: "https://www.jasso.go.jp/en/study_j/scholarships/index.html",
    organizationName: "Japan Student Services Organization",
    country: "Japan",
    degreeLevel: "bachelor",
    fieldOfStudy: "multiple disciplines",
    fundingType: "partially_funded",
    titleHint: "JASSO Honors Scholarship for Privately Financed International Students",
  },
  {
    externalId: "japan-u-tokyo-scholarships",
    url: "https://www.u-tokyo.ac.jp/en/prospective-students/scholarships.html",
    organizationName: "University of Tokyo",
    country: "Japan",
    degreeLevel: "master",
    fieldOfStudy: "research",
    fundingType: "fully_funded",
    titleHint: "University of Tokyo Scholarships for International Students",
  },
];

const ASIAN_OFFICIAL_DESCRIPTIONS = {
  "japan-mext-embassy":
    "MEXT (Monbukagakusho) scholarships via Japanese embassy recommendation support international students for undergraduate and graduate study in Japan with tuition, monthly stipend, and travel allowances.",
  "japan-jica-young-leaders":
    "JICA's government-sponsored training and degree pathways support professionals from partner countries in development policy, public administration, and technical fields at Japanese institutions.",
  "korea-gks-graduate":
    "The Global Korea Scholarship (GKS-G) funds international students for master's and doctoral degrees at Korean universities, including tuition, settlement allowance, airfare, and medical insurance.",
  "china-csc-government":
    "Chinese Government Scholarships (CSC) fund international students to study at Chinese universities in degree programmes and Chinese language study through bilateral and university channels.",
  "taiwan-scholarship-moe":
    "Taiwan Scholarships, administered by the Ministry of Education, support outstanding international students for degree study at participating Taiwanese universities with tuition and living stipends.",
  "taiwan-icdf-scholarship":
    "Taiwan ICDF scholarships support students from partner developing countries for higher education in Taiwan in fields linked to economic development and technical cooperation.",
  "hong-kong-phd-fellowship":
    "The Hong Kong PhD Fellowship Scheme (HKPFS) attracts outstanding international PhD candidates to Hong Kong universities with a competitive stipend, conference allowance, and research support.",
  "singapore-asean-scholarships":
    "ASEAN Scholarships offered by Singapore's Ministry of Education support high-achieving students from ASEAN countries for secondary and pre-university study in Singapore.",
  "singapore-singa-award":
    "SINGA awards PhD training in science and engineering at A*STAR research institutes and Singapore universities with full tuition, monthly stipend, and research attachment support.",
  "indonesia-darmasiswa":
    "Darmasiswa is Indonesia's scholarship for international students to study Indonesian language, art, and culture at Indonesian higher education institutions for one academic year.",
  "malaysia-mis":
    "Malaysia International Scholarship (MIS) supports talented international students for postgraduate study at Malaysian public and private universities with tuition and living allowances.",
  "malaysia-mtcp":
    "The Malaysian Technical Cooperation Programme (MTCP) offers postgraduate training in Malaysia for officials and professionals from developing countries in technical and diplomatic fields.",
  "malaysia-mara-biasiswa":
    "MARA scholarships and loans support Malaysian and eligible Bumiputera students for tertiary study domestically and abroad in priority science, technology, and professional fields.",
  "thailand-tipp":
    "Thailand International Postgraduate Programme (TIPP) provides fully funded master's study in Thailand for citizens of developing countries in SDG-related disciplines.",
  "philippines-dost-sei":
    "DOST-SEI scholarship programmes fund Filipino students in science, technology, engineering, and mathematics from undergraduate through doctoral study and research placements.",
  "brunei-bdgs":
    "Brunei Darussalam Government Scholarships offer international students fully funded undergraduate and postgraduate study at Brunei universities with allowances and accommodation.",
  "brunei-ubd-graduate":
    "University of Brunei Darussalam graduate scholarships support international master's and PhD candidates with tuition waivers, stipends, and research funding at UBD.",
  "india-nsp-scholarships":
    "India's National Scholarship Portal (NSP) centralises central and state government scholarships for school and higher education students based on merit, means, and category criteria.",
  "pakistan-hec-foreign":
    "HEC foreign scholarships support Pakistani faculty and students for overseas study and research through bilateral and multilateral partnerships with approved universities.",
  "bangladesh-ugc-scholarship":
    "The University Grants Commission of Bangladesh publishes government and institutional scholarship information for higher education students in public and private universities.",
  "nepal-moe-scholarships":
    "Nepal's Ministry of Education scholarship schemes support students for domestic tertiary study and selected overseas programmes in priority development and technical fields.",
  "sri-lanka-mohe-scholarships":
    "Sri Lanka's Ministry of Higher Education coordinates state scholarships for university study abroad and local higher education access for eligible Sri Lankan students.",
  "kazakhstan-bolashak":
    "The Bolashak Presidential Scholarship funds high-achieving Kazakh citizens for undergraduate and postgraduate study at top international universities in priority disciplines.",
  "uzbekistan-elyurt-umidi":
    "El-Yurt Umidi (Presidential) scholarships support talented Uzbek youth for study at leading foreign universities in engineering, medicine, and public administration.",
  "japan-kyoto-iuop":
    "Kyoto University's International Undergraduate Program offers merit-based financial support for international students in science and interdisciplinary degree tracks.",
  "korea-kaist-intl-undergrad":
    "KAIST international undergraduate scholarships cover tuition and living costs for outstanding non-Korean students in science and engineering bachelor's programmes.",
  "korea-snu-global":
    "Seoul National University global scholarships support international graduate students with tuition assistance and living stipends across participating faculties and graduate schools.",
  "china-peking-csc":
    "Peking University administers Chinese Government Scholarship places for international master's and doctoral applicants with tuition, accommodation, and stipend support.",
  "china-tsinghua-intl-grad":
    "Tsinghua University international graduate scholarships fund tuition and living expenses for outstanding master's and PhD candidates from around the world.",
  "singapore-nus-research":
    "The NUS Research Scholarship supports international PhD candidates with full tuition, monthly stipend, and research expenses at the National University of Singapore.",
  "singapore-ntu-research":
    "NTU Research Scholarships fund doctoral study at Nanyang Technological University with tuition coverage, stipend, and conference support for international researchers.",
  "hong-kong-hkust-redbird":
    "HKUST RedBird PhD awards provide competitive funding for exceptional international doctoral candidates in science, engineering, and business at HKUST.",
  "japan-jasso-honors":
    "JASSO Honors Scholarships provide monthly stipends to privately financed international students enrolled in Japanese universities, junior colleges, and colleges of technology.",
  "japan-u-tokyo-scholarships":
    "The University of Tokyo offers MEXT, university recommendation, and private scholarships for international students in undergraduate and graduate degree programmes.",
};

module.exports = {
  ASIAN_OFFICIAL_SCRAPE_PROGRAMMES,
  ASIAN_OFFICIAL_DESCRIPTIONS,
};
