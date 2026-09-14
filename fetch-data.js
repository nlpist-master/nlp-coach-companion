const SHEET_ID = "1ZZaEVudyr_9wDqD9RaQkIrYyAC2AVU10i9xHB2YhI58";
const BASE_URL = `[https://opensheet.elk.sh/$](https://opensheet.elk.sh/$){SHEET_ID}`;

async function fetchFromSheets() {
  const [
    topicsData,
    learningQsData,
    coachingQsData,
    scenariosData,
    guidanceData
  ] = await Promise.all([
    fetch(`${BASE_URL}/LearningTopics`).then(res => res.json()),
    fetch(`${BASE_URL}/LearningQuestions`).then(res => res.json()),
    fetch(`${BASE_URL}/CoachingQuestions`).then(res => res.json()),
    fetch(`${BASE_URL}/ClientScenarios`).then(res => res.json()),
    fetch(`${BASE_URL}/ScenarioGuidance`).then(res => res.json())
  ]);

  const learningTopics = topicsData.map(topic => {
    const questions = learningQsData
      .filter(q => q.topic_id === topic.id)
      .map(q => ({ q: q.q, a: q.a }));

    return {
      id: topic.id,
      title: topic.title,
      subtitle: topic.subtitle,
      icon: topic.icon,
      questions: questions
    };
  });

  const coachingQuestions = coachingQsData.map(item => ({
    id: item.id,
    category: item.category,
    text: item.text,
    context: item.context
  }));

  const questionCategories = Array.from(
    new Set(coachingQuestions.map(item => item.category))
  );

  const clientScenarios = scenariosData.map(scenario => {
    const scenarioGuidanceRows = guidanceData.filter(
      g => g.scenario_id === scenario.id
    );

    const guidance = {
      explore: [],
      possibleQuestions: [],
      thinkingDirections: [],
      watchFor: []
    };

    scenarioGuidanceRows.forEach(row => {
      if (guidance[row.type]) {
        guidance[row.type].push(row.text);
      }
    });

    const tags = scenario.tags
      ? scenario.tags.split(',').map(tag => tag.trim())
      : [];

    return {
      id: scenario.id,
      title: scenario.title,
      summary: scenario.summary,
      clientQuote: scenario.clientQuote,
      tags: tags,
      guidance: guidance
    };
  });

  return {
    demoLabel: "תוכן Google Sheets דינמי",
    learningTopics: learningTopics,
    coachingQuestions: coachingQuestions,
    questionCategories: questionCategories,
    clientScenarios: clientScenarios
  };
}

function showUpdateNotification() {
  if (document.getElementById('update-toast-btn')) return;

  const btn = document.createElement('button');
  btn.id = 'update-toast-btn';
  btn.innerText = '✨ קיימים עדכוני תוכן חדשים! לחץ לרענון';
  btn.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 9999;
    background-color: #2563eb;
    color: #ffffff;
    border: none;
    padding: 12px 20px;
    border-radius: 30px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    cursor: pointer;
    font-weight: bold;
    font-size: 14px;
    direction: rtl;
    transition: transform 0.2s, background-color 0.2s;
  `;

  btn.onmouseover = () => btn.style.backgroundColor = '#1d4ed8';
  btn.onmouseout = () => btn.style.backgroundColor = '#2563eb';

  btn.onclick = () => {
    const pendingData = localStorage.getItem('pending_app_data');
    if (pendingData) {
      localStorage.setItem('cached_app_data', pendingData);
      localStorage.removeItem('pending_app_data');
      window.APP_DATA = JSON.parse(pendingData);
      window.dispatchEvent(new Event('appDataReady'));
      btn.remove();
    }
  };

  document.body.appendChild(btn);
}

async function initDataSync() {
  const cachedData = localStorage.getItem('cached_app_data');

  if (cachedData) {
    window.APP_DATA = JSON.parse(cachedData);
    window.dispatchEvent(new Event('appDataReady'));
  }

  try {
    const newData = await fetchFromSheets();
    const newDataStr = JSON.stringify(newData);

    if (!cachedData) {
      localStorage.setItem('cached_app_data', newDataStr);
      window.APP_DATA = newData;
      window.dispatchEvent(new Event('appDataReady'));
    } else if (cachedData !== newDataStr) {
      localStorage.setItem('pending_app_data', newDataStr);
      showUpdateNotification();
    }
  } catch (error) {
    console.error("Error syncing with Google Sheets:", error);
  }
}

initDataSync();