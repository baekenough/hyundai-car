// 클릭 카운터 관련 변수
let clickCount = 0;
let clickTimer = null;
const CLICK_THRESHOLD = 10;
const CLICK_TIMEOUT = 5000;

// 데이터 관련 변수
let data = [];
let filteredData = [];
let carTypeSet = new Set();
let colorSet = new Set();
let currentFilters = {
  carType: "",
  engine: "",
  trim: "",
  color: "",
};
let uploadedCsvContent = null;
let isUsingUploadedFile = false;

// 엑셀 파일을 업로드하고 변환하는 로직
document.addEventListener('DOMContentLoaded', function() {
  // 현재 날짜 표시
  document.getElementById("currentDate").textContent = formatDate(new Date());
  
  // 파일 업로드 요소 참조
  const fileInput = document.getElementById('csvFile');
  const updateButton = document.getElementById('updateCsv');
  const statusElement = document.getElementById('uploadStatus');
  
  // 버튼 초기화 - 명시적으로 숨김
  if (updateButton) {
    updateButton.style.display = 'none';
  }
  
  // 제목 클릭 이벤트 처리
  document.querySelector("h2").addEventListener("click", function () {
    clickCount++;

    if (clickTimer === null) {
      clickTimer = setTimeout(() => {
        clickCount = 0;
        clickTimer = null;
      }, CLICK_TIMEOUT);
    }

    if (clickCount >= CLICK_THRESHOLD) {
      // CSV 업로드 컨테이너 표시
      document
        .querySelector(".csv-upload-container")
        .classList.add("active");
      document.querySelector(".overlay").classList.add("active");

      // 타이머와 카운터 초기화
      clearTimeout(clickTimer);
      clickCount = 0;
      clickTimer = null;
    }
  });

  // 닫기 버튼 이벤트 처리
  document
    .querySelector(".close-button")
    .addEventListener("click", function () {
      document
        .querySelector(".csv-upload-container")
        .classList.remove("active");
      document.querySelector(".overlay").classList.remove("active");
    });

  // 오버레이 클릭 시 닫기
  document.querySelector(".overlay").addEventListener("click", function () {
    document
      .querySelector(".csv-upload-container")
      .classList.remove("active");
    document.querySelector(".overlay").classList.remove("active");
  });
  
  // 필터 초기화 버튼 이벤트 리스너
  document
    .getElementById("refreshFilters")
    .addEventListener("click", function () {
      // 모든 select 요소 초기화
      document.getElementById("carType").value = "";
      document.getElementById("engine").value = "";
      document.getElementById("trim").value = "";
      document.getElementById("color").value = "";

      // 필터링 함수 실행
      filterResults();
    });
  
  // 이벤트 리스너 등록
  document
    .getElementById("carType")
    .addEventListener("change", debouncedFilter);
  document
    .getElementById("engine")
    .addEventListener("change", debouncedFilter);
  document
    .getElementById("trim")
    .addEventListener("change", debouncedFilter);
  document
    .getElementById("color")
    .addEventListener("change", debouncedFilter);
  
  // xlsx.js 라이브러리가 로드되었는지 확인
  if (typeof XLSX === 'undefined') {
    console.error('XLSX 라이브러리가 로드되지 않았습니다.');
    if (statusElement) {
      statusElement.textContent = 'XLSX 라이브러리 로드 실패';
      statusElement.style.color = 'red';
    }
    return;
  }
  
  // 파일 선택 이벤트 처리
  fileInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    
    if (!file) {
      return;
    }
    
    // 파일 확장자 확인
    const fileExt = file.name.split('.').pop().toLowerCase();
    
    if (fileExt !== 'xlsx') {
      alert('엑셀 파일(.xlsx)만 업로드 가능합니다.');
      fileInput.value = '';
      if (updateButton) updateButton.style.display = 'none';
      return;
    }
    
    if (statusElement) {
      statusElement.textContent = '파일 로드 중...';
      statusElement.style.color = 'blue';
    }
    
    // 파일 읽기
    const reader = new FileReader();
    
    reader.onload = function(e) {
      try {
        // 디버그 정보 초기화
        const debugElement = document.getElementById('debugInfo');
        if (debugElement) {
          debugElement.textContent = '';
        }
        
        const appendDebugInfo = (message) => {
          console.log(message);
          // 디버그 정보는 콘솔에만 출력하고 UI에는 표시하지 않음
          // 디버그 정보를 UI에 표시하고 싶다면 아래 주석을 제거
          /*
          if (debugElement) {
            debugElement.textContent += message + '\n';
          }
          */
        };
        
        // 엑셀 파일 파싱
        const data = new Uint8Array(e.target.result);
        appendDebugInfo(`파일 크기: ${data.length} 바이트`);
        const workbook = XLSX.read(data, { type: 'array' });
        
        appendDebugInfo(`엑셀 파일 읽기 성공. 시트 개수: ${workbook.SheetNames.length}`);
        appendDebugInfo(`시트 목록: ${workbook.SheetNames.join(', ')}`);
        
        // 엑셀을 CSV로 변환
        const result = convertExcelToCSV(workbook);
        
        if (result.success) {
          // 전역 변수에 CSV 데이터 저장
          uploadedCsvContent = result.data;
          
          if (statusElement) {
            statusElement.textContent = `변환 완료 (${result.count}개 데이터)`;
            statusElement.style.color = 'green';
          }
          
          document.getElementById('status').textContent = 
            'XLSX 파일이 성공적으로 CSV로 변환되었습니다. 업데이트 버튼을 눌러 저장하세요.';
          
          // 디버그 정보 미리보기 비활성화
          /* 
          // CSV 데이터 미리보기 (첫 500자만)
          if (result.data) {
            const previewElement = document.getElementById('debugInfo');
            if (previewElement) {
              previewElement.textContent += '\n\n--- CSV 데이터 미리보기 ---\n';
              previewElement.textContent += result.data.substring(0, 500);
              previewElement.textContent += '\n...';
            }
          }
          */
          
          // 업데이트 버튼 활성화 - 반드시 보이도록 함
          const updateBtn = document.getElementById('updateCsv');
          if (updateBtn) {
            console.log('업데이트 버튼 표시');
            updateBtn.style.display = 'block';
            
            // 버튼이 잘 보이도록 강조
            updateBtn.style.backgroundColor = '#ff6600';
            updateBtn.style.fontWeight = 'bold';
            
            // 업로드 컨테이너 스크롤
            const container = document.querySelector('.csv-upload-container');
            if (container) {
              container.scrollTop = container.scrollHeight;
            }
          } else {
            console.error('업데이트 버튼 요소를 찾을 수 없습니다!');
          }
        } else {
          if (statusElement) {
            statusElement.textContent = result.error;
            statusElement.style.color = 'red';
          }
          // 업데이트 버튼 비활성화
          if (updateButton) {
            updateButton.style.display = 'none';
          }
        }
      } catch (error) {
        console.error('파일 처리 중 오류 발생:', error);
        if (statusElement) {
          statusElement.textContent = `오류: ${error.message}`;
          statusElement.style.color = 'red';
        }
        // 업데이트 버튼 비활성화
        if (updateButton) {
          updateButton.style.display = 'none';
        }
      }
    };
    
    reader.onerror = function() {
      console.error('파일 읽기 오류');
      if (statusElement) {
        statusElement.textContent = '파일 읽기 오류';
        statusElement.style.color = 'red';
      }
    };
    
    // 파일을 ArrayBuffer로 읽기
    reader.readAsArrayBuffer(file);
  });
  
  // CSV 업데이트 버튼 클릭 이벤트
  if (updateButton) {
    updateButton.addEventListener('click', async function() {
      if (!uploadedCsvContent) {
        alert('먼저 엑셀 파일을 업로드하세요.');
        return;
      }
      
      if (statusElement) {
        statusElement.textContent = 'GitHub에 업로드 중...';
        statusElement.style.color = 'blue';
      }
      
      try {
        // CSV 데이터의 크기가 큰 경우를 대비해 청크로 나누어 전송
        const csvData = uploadedCsvContent;
        console.log(`CSV 데이터 크기: ${csvData.length} 바이트`);
        
        // 데이터 크기가 1MB를 초과하는 경우 경고
        if (csvData.length > 1024 * 1024) {
          console.warn(`데이터 크기가 크므로 업로드에 실패할 수 있습니다: ${Math.round(csvData.length / 1024)} KB`);
          
          // 큰 파일 경고
          if (confirm('데이터 크기가 큽니다. 계속 진행하시겠습니까? (실패할 수 있습니다)')) {
            console.log('사용자가 큰 파일 업로드 계속 진행 선택');
          } else {
            if (statusElement) {
              statusElement.textContent = '업로드 취소됨 (파일 크기 문제)';
              statusElement.style.color = 'orange';
            }
            return;
          }
        }
        
        // 서버리스 함수에 CSV 데이터 전송
        const response = await fetch('/.netlify/functions/update-csv', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            content: csvData,
            timestamp: new Date().getTime() 
          }),
        });
        
        // 응답 확인
        if (!response.ok) {
          throw new Error(`서버 응답 오류: ${response.status} ${response.statusText}`);
        }
        
        let data;
        try {
          const responseText = await response.text();
          console.log('서버 응답:', responseText);
          data = JSON.parse(responseText);
        } catch (parseError) {
          console.error('JSON 파싱 오류:', parseError);
          throw new Error('서버 응답을 처리할 수 없습니다: ' + parseError.message);
        }
        
        if (data.message) {
          if (statusElement) {
            statusElement.textContent = data.message;
            statusElement.style.color = 'green';
          }
          document.getElementById('status').textContent = 
            'CSV 파일이 성공적으로 업데이트되었습니다. 페이지를 새로고침하면 변경사항이 적용됩니다.';
          
          // 업로드 후 3초 후에 페이지 새로고침
          setTimeout(() => {
            location.reload();
          }, 3000);
        } else {
          if (statusElement) {
            statusElement.textContent = data.error || '업로드 실패';
            statusElement.style.color = 'red';
          }
          document.getElementById('status').textContent = 
            'CSV 파일 업데이트 실패: ' + (data.error || '알 수 없는 오류');
        }
      } catch (error) {
        console.error('CSV 업로드 오류:', error);
        if (statusElement) {
          statusElement.textContent = `업로드 오류: ${error.message}`;
          statusElement.style.color = 'red';
        }
        document.getElementById('status').textContent = 
          'CSV 파일 업데이트 실패: ' + error.message;
      }
    });
  }
  
  // 초기 데이터 로드
  loadData();
});

// 현재 날짜 포맷팅 함수
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// 디바운스 함수 - 연속 호출 시 마지막 호출만 실행
function debounce(func, wait) {
  let timeout;
  return function () {
    const context = this;
    const args = arguments;
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      func.apply(context, args);
    }, wait);
  };
}

// 디바운스된 필터링 함수
const debouncedFilter = debounce(filterResults, 300);

async function loadData() {
  try {
    // 로딩 표시
    document.getElementById("results").innerHTML =
      '<div class="loading">데이터를 불러오는 중입니다...</div>';
    document.getElementById("status").textContent =
      "데이터를 불러오는 중...";

    const startTime = performance.now();
    const response = await fetch("data.csv");

    if (!response.ok) {
      throw new Error(`HTTP 에러! 상태: ${response.status}`);
    }

    const text = await response.text();
    processCSVData(text);

    const endTime = performance.now();
    document.getElementById(
      "status"
    ).textContent = `데이터 로드 완료 (${Math.round(
      endTime - startTime
    )}ms)`;
  } catch (error) {
    console.error("데이터 로딩 중 오류 발생:", error);
    document.getElementById(
      "results"
    ).innerHTML = `<div class="no-data">데이터 로딩 중 오류가 발생했습니다: ${error.message}</div>`;
    document.getElementById("status").textContent = "데이터 로드 실패";
  }
}

function processCSVData(csvText, isPreview = false) {
  const startTime = performance.now();

  const rows = csvText
    .trim()
    .split("\n")
    .map((r) =>
      r.split(",").map((cell) => cell.trim().replace(/^"|"$/g, ""))
    );

  if (!rows || rows.length === 0) {
    throw new Error("CSV 데이터 형식이 올바르지 않습니다.");
  }

  const headers = rows[0];
  const processedData = rows.slice(1).map((row) => {
    let obj = {};
    headers.forEach((h, i) => {
      const val = row[i] || "";
      obj[h] = val;
    });
    return obj;
  });

  if (!isPreview) {
    // 실제 데이터로 사용할 때만 전역 변수 업데이트
    data = processedData;

    // 초기화
    carTypeSet.clear();
    colorSet.clear();

    // 데이터 인덱싱
    data.forEach((row) => {
      if (row["차종"]) carTypeSet.add(row["차종"]);
      if (row["외장칼라"]) colorSet.add(row["외장칼라"]);
    });

    populateSelect("carType", Array.from(carTypeSet));
    populateSelect("color", Array.from(colorSet));

    // 초기 필터링
    filteredData = [...data];
  }

  const endTime = performance.now();
  console.log(`데이터 처리 시간: ${Math.round(endTime - startTime)}ms`);

  if (!isPreview) {
    renderResults();
  }

  return processedData;
}

function populateSelect(id, items) {
  const select = document.getElementById(id);
  // 기존 옵션 중 첫 번째(기본 옵션)을 제외한 나머지 삭제
  while (select.options.length > 1) {
    select.remove(1);
  }

  items.sort().forEach((item) => {
    const option = document.createElement("option");
    option.value = item;
    option.textContent = item;
    select.appendChild(option);
  });
}

function filterResults() {
  const startTime = performance.now();

  // 필터 값 가져오기
  currentFilters = {
    carType: document.getElementById("carType").value,
    engine: document.getElementById("engine").value,
    trim: document.getElementById("trim").value,
    color: document.getElementById("color").value,
  };

  // Update trim and color options based on selected car type and engine
  updateTrimAndColorOptions();

  // 필터링 적용
  filteredData = data.filter(
    (row) =>
      (currentFilters.carType === "" ||
        row["차종"] === currentFilters.carType) &&
      (currentFilters.engine === "" ||
        row["엔진"] === currentFilters.engine) &&
      (currentFilters.trim === "" ||
        row["트림"] === currentFilters.trim) &&
      (currentFilters.color === "" ||
        row["외장칼라"] === currentFilters.color)
  );

  const endTime = performance.now();
  document.getElementById(
    "status"
  ).textContent = `필터링 완료 (${Math.round(endTime - startTime)}ms) - ${
    filteredData.length
  }개 결과 찾음`;

  renderResults();
}

function updateTrimAndColorOptions() {
  const selectedCarType = document.getElementById("carType").value;
  const selectedEngine = document.getElementById("engine").value;

  // Get unique trims and colors based on selected car type and engine
  const trimSet = new Set();
  const colorSet = new Set();
  const engineSet = new Set();

  data.forEach((row) => {
    const matchesCarType =
      selectedCarType === "" || row["차종"] === selectedCarType;

    if (matchesCarType) {
      if (row["엔진"]) engineSet.add(row["엔진"]);
      if (selectedEngine === "" || row["엔진"] === selectedEngine) {
        if (row["트림"]) trimSet.add(row["트림"]);
        if (row["외장칼라"]) colorSet.add(row["외장칼라"]);
      }
    }
  });

  // Update engine options
  const engineSelect = document.getElementById("engine");
  const currentEngine = engineSelect.value;
  engineSelect.innerHTML = '<option value="">엔진 선택</option>';
  const engineOptions = Array.from(engineSet).sort();
  engineOptions.forEach((engine) => {
    const option = document.createElement("option");
    option.value = engine;
    option.textContent = engine;
    engineSelect.appendChild(option);
  });

  // 엔진이 1개일 경우 자동 선택
  if (engineOptions.length === 1) {
    engineSelect.value = engineOptions[0];
    // 엔진이 자동 선택되었으므로 trim과 color 옵션도 업데이트
    const selectedEngine = engineOptions[0];
    trimSet.clear();
    colorSet.clear();

    data.forEach((row) => {
      if (
        (selectedCarType === "" || row["차종"] === selectedCarType) &&
        row["엔진"] === selectedEngine
      ) {
        if (row["트림"]) trimSet.add(row["트림"]);
        if (row["외장칼라"]) colorSet.add(row["외장칼라"]);
      }
    });
  }

  // Update trim options
  const trimSelect = document.getElementById("trim");
  const currentTrim = trimSelect.value;
  trimSelect.innerHTML = '<option value="">트림 선택</option>';
  const trimOptions = Array.from(trimSet).sort();
  trimOptions.forEach((trim) => {
    const option = document.createElement("option");
    option.value = trim;
    option.textContent = trim;
    trimSelect.appendChild(option);
  });

  // 트림이 1개일 경우 자동 선택
  if (trimOptions.length === 1) {
    trimSelect.value = trimOptions[0];
    // 트림이 자동 선택되었으므로 color 옵션도 업데이트
    const selectedTrim = trimOptions[0];
    colorSet.clear();

    data.forEach((row) => {
      if (
        (selectedCarType === "" || row["차종"] === selectedCarType) &&
        (selectedEngine === "" || row["엔진"] === selectedEngine) &&
        row["트림"] === selectedTrim
      ) {
        if (row["외장칼라"]) colorSet.add(row["외장칼라"]);
      }
    });
  }

  // Update color options
  const colorSelect = document.getElementById("color");
  const currentColor = colorSelect.value;
  colorSelect.innerHTML = '<option value="">외장칼라 선택</option>';
  Array.from(colorSet)
    .sort()
    .forEach((color) => {
      const option = document.createElement("option");
      option.value = color;
      option.textContent = color;
      colorSelect.appendChild(option);
    });

  // Restore previous selections if they still exist in the new options
  if (currentEngine && engineSet.has(currentEngine)) {
    engineSelect.value = currentEngine;
  }
  if (currentTrim && trimSet.has(currentTrim)) {
    trimSelect.value = currentTrim;
  }
  if (currentColor && colorSet.has(currentColor)) {
    colorSelect.value = currentColor;
  }
}

function renderResults() {
  const startTime = performance.now();

  const container = document.getElementById("results");
  container.innerHTML = "";

  if (filteredData.length === 0) {
    container.innerHTML =
      '<div class="no-data">일치하는 차량이 없습니다.</div>';
    return;
  }

  // 결과가 많을 경우 성능을 위해 가상화 또는 페이지네이션 적용
  const maxDisplay = 50;
  const displayCount = Math.min(filteredData.length, maxDisplay);

  // DocumentFragment 사용하여 DOM 조작 최소화
  const fragment = document.createDocumentFragment();

  for (let i = 0; i < displayCount; i++) {
    const row = filteredData[i];
    const card = document.createElement("div");
    card.className = "card";

    Object.entries(row).forEach(([key, val]) => {
      const highlight =
        key === "슈퍼세이브조건" || key === "조건 계" ? "highlight" : "";
      const line = document.createElement("div");
      line.innerHTML = `<span class='label ${highlight}'>${key}:</span> <span class='${highlight}'>${val}</span>`;
      card.appendChild(line);
    });

    fragment.appendChild(card);
  }

  container.appendChild(fragment);

  // 결과가 많을 경우 알림 추가
  if (filteredData.length > maxDisplay) {
    const notice = document.createElement("div");
    notice.className = "status";
    notice.textContent = `총 ${filteredData.length}개 중 ${maxDisplay}개만 표시됩니다. 더 정확한 검색을 위해 필터를 추가해주세요.`;
    container.appendChild(notice);
  }

  const endTime = performance.now();
  console.log(`렌더링 시간: ${Math.round(endTime - startTime)}ms`);
} 