# Node.js Integration Guide: Calling the FastAPI ML API

You can call the FastAPI /predict endpoint from your Node.js backend using axios.

## 1. Install axios

```
npm install axios
```

## 2. Example Code for Prediction

```js
const axios = require("axios");

async function predictScholarship(features) {
  const response = await axios.post("http://localhost:8000/predict", {
    features,
  });
  // Response: { score: 0.87, label: 'valid' }
  return response.data;
}

// Example usage:
const features = {
  has_official_domain: 1,
  has_deadline: 1,
  has_eligibility: 1,
  has_contact_info: 1,
  keyword_density: 0.18,
  content_length: 1500,
  is_https: 1,
};

predictScholarship(features).then(console.log);
```

## 3. Recommendation Endpoint

Call the /recommend endpoint for student-scholarship matching.

```js
async function getRecommendation(student, scholarship) {
  const response = await axios.post("http://localhost:8000/recommend", {
    student,
    scholarship,
  });
  // Response: { score: 82, explanations: [...], warnings: [...] }
  return response.data;
}

// Example usage:
const student = {
  field: "Computer Science",
  gpa: 3.8,
  country: "USA",
  financial_need: true,
};

const scholarship = {
  field: "Computer Science",
  location: "USA",
  funding: "Full funding",
  requirements: { gpa: 3.5 },
};

getRecommendation(student, scholarship).then(console.log);
```

## 4. Notes

- Ensure the FastAPI server is running (`uvicorn api:app --reload` in the ml folder).
- Adjust the URL if deploying elsewhere.
- The /predict API returns a probability score and label for candidate verification.
- The /recommend API returns a match score (0-100) with explanations and warnings.
