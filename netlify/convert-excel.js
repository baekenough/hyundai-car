/**
 * 엑셀 파일(.xlsx)을 CSV로 변환하는 스크립트
 */

// 차종 이름을 추출하는 함수
function extractModelName(sheetName) {
  if (sheetName.includes('쏘나타')) {
    return '쏘나타';
  } else if (sheetName.includes('코나')) {
    return '코나';
  } else if (sheetName.includes('그랜저')) {
    return '그랜저';
  } else if (sheetName.includes('투싼')) {
    return '투싼';
  } else if (sheetName.includes('싼타페')) {
    return '싼타페';
  } else if (sheetName.includes('아이오닉5')) {
    return '아이오닉5';
  } else if (sheetName.includes('아이오닉6')) {
    return '아이오닉6';
  }
  // 기본값은 시트 이름 그대로 반환
  return sheetName;
}

// 엔진 타입을 결정하는 함수
function determineEngine(sheetName, trimText) {
  if (sheetName.includes('HEV')) {
    return '하이브리드';
  } else if (sheetName.includes('EV')) {
    return '전기';
  } else if (trimText && trimText.includes('가솔린')) {
    return '가솔린';
  } else if (trimText && trimText.includes('Lpi')) {
    return 'Lpi';
  }
  // 기본값은 빈 문자열
  return '';
}

// 트림을 결정하는 함수
function determineTrim(trimText) {
  if (!trimText) {
    return '';
  }
  
  if (trimText.includes('N Line')) {
    return 'N Line';
  } else if (trimText.includes('익스클루시브')) {
    return '익스클루시브';
  } else if (trimText.includes('인스퍼레이션')) {
    return '인스퍼레이션';
  } else if (trimText.includes('프레스티지')) {
    return '프레스티지';
  } else if (trimText.includes('프리미엄')) {
    return '프리미엄';
  } else if (trimText.includes('롱레인지')) {
    return '롱레인지';
  }
  // 기본값은 빈 문자열
  return '';
}

// 데이터가 유효한 행인지 확인하는 함수
function isValidDataRow(rowData) {
  // 생산번호가 유효한지 확인
  const productionNum = String(rowData['생산번호'] || '').trim();
  const hasValidProductionNumber = productionNum !== '' && 
                                 productionNum.toLowerCase() !== '생산번호';
  
  // 판매가격이 실제 숫자인지 확인
  const price = String(rowData['판매가격(만원)'] || '').trim();
  let hasValidPrice = price !== '' && 
                     price.toLowerCase() !== '판매가' && 
                     price.toLowerCase() !== '판매가격' && 
                     price.toLowerCase() !== '판매가격(만원)';
  
  try {
    // 숫자로 변환 가능한지 확인
    if (price !== '') {
      parseFloat(price.replace(/,/g, ''));
    }
  } catch (e) {
    hasValidPrice = false;
  }
  
  // 엔진 타입이 의미 있는 값인지 확인
  const engine = String(rowData['엔진'] || '').trim();
  const hasValidEngine = engine !== '' && 
                        engine.toLowerCase() !== '엔진';
  
  // 차종이 헤더가 아닌지 확인
  const model = String(rowData['차종'] || '').trim();
  const isNotHeader = model !== '' && model.toLowerCase() !== '차종';
  
  // 출고센터가 실제 값인지 확인
  const center = String(rowData['출고센터'] || '').trim();
  const hasValidCenter = center !== '' && center.toLowerCase() !== '출고센터';
  
  // 옵션 필드에 실제 내용이 있는지 확인
  const options = String(rowData['옵션'] || '').trim();
  const hasValidOptions = options !== '' && options.toLowerCase() !== '옵션';
  
  // 최소 조건만 체크하도록 완화
  return hasValidProductionNumber && 
         isNotHeader && 
         model !== '';  // 차종 정보가 있기만 하면 유효한 것으로 간주
}

// XLSX 파일을 파싱하고 CSV 데이터로 변환하는 함수
function convertExcelToCSV(workbook) {
  // 결과 데이터를 저장할 배열
  const allData = [];
  
  // 헤더 정의
  const headers = [
    "차종", "엔진", "트림", "외장칼라", "내장칼라", 
    "생산번호", "출고센터", "생산일", "옵션", "판매가격(만원)", 
    "기본조건", "생산월조건", "판촉차조건", "페스타조건", 
    "슈퍼세이브조건", "조건 계"
  ];
  
  try {
    // 처리 정보 기록
    let totalRows = 0;
    let filteredRows = 0;
    let validRows = 0;
    
    // 디버그 정보 출력 함수 정의
    const appendDebugInfo = (message) => {
      console.log(message);
      // UI의 debugElement가 있으면 해당 요소에도 출력
      const debugElement = document.getElementById('debugInfo');
      if (debugElement) {
        debugElement.textContent += message + '\n';
      }
    };
    
    // 모든 시트 처리
    workbook.SheetNames.forEach(sheetName => {
      appendDebugInfo(`시트 처리 중: ${sheetName}`);
      const worksheet = workbook.Sheets[sheetName];
      
      // 워크시트 범위 정보 출력
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
      appendDebugInfo(`시트 ${sheetName} 범위: ${worksheet['!ref']}, 행 수: ${range.e.r - range.s.r + 1}, 열 수: ${range.e.c - range.s.c + 1}`);
      
      // 실제 데이터의 시작 위치 찾기 (보통 5행부터 데이터 시작)
      let dataStartRow = 5; // 기본값으로 5행 설정 (대부분의 시트에서 5행부터 데이터 시작)
      
      // 데이터 테이블의 헤더 행 찾기 (생산번호, 출고센터 등의 헤더가 있는 행)
      for (let i = 1; i <= Math.min(20, range.e.r); i++) {
        const jCell = worksheet['J' + i];
        const kCell = worksheet['K' + i];
        
        // J열에 '생산번호', K열에 '출고센터' 문구가 있으면 해당 행을 헤더 행으로 간주
        if (jCell && kCell && 
            String(jCell.v).includes('생산번호') && 
            String(kCell.v).includes('출고센터')) {
          dataStartRow = i + 1; // 헤더 다음 행부터 데이터 시작
          appendDebugInfo(`데이터 시작 행 감지: ${dataStartRow}행`);
          break;
        }
      }
      
      // 셀 구조 샘플 (처음 몇 개 셀만 확인)
      appendDebugInfo(`시트 ${sheetName} 셀 샘플 (데이터 시작 행):`);
      const headerRow = dataStartRow - 1;
      appendDebugInfo(`헤더 행(${headerRow}):`);
      
      // 헤더 행의 각 열 정보 출력
      for (let col = 0; col <= Math.min(15, range.e.c); col++) {
        const cellRef = XLSX.utils.encode_cell({r: headerRow-1, c: col});
        const cell = worksheet[cellRef];
        if (cell) {
          appendDebugInfo(`  ${cellRef}: ${cell.v || '(빈 셀)'}`);
        }
      }
      
      // 첫 번째 데이터 행의 샘플 출력
      appendDebugInfo(`첫번째 데이터 행(${dataStartRow}):`);
      for (let col = 0; col <= Math.min(15, range.e.c); col++) {
        const cellRef = XLSX.utils.encode_cell({r: dataStartRow-1, c: col});
        const cell = worksheet[cellRef];
        if (cell) {
          appendDebugInfo(`  ${cellRef}: ${cell.v || '(빈 셀)'}`);
        }
      }
      
      // 엑셀을 JSON으로 변환 (실제 데이터 부분만)
      const jsonData = [];
      
      // 각 데이터 행 처리
      for (let r = dataStartRow - 1; r <= range.e.r; r++) {
        const rowObj = {};
        let hasData = false;
        
        // 각 열 처리
        for (let c = 0; c <= range.e.c; c++) {
          const cellRef = XLSX.utils.encode_cell({r: r, c: c});
          const cell = worksheet[cellRef];
          const colName = XLSX.utils.encode_col(c); // A, B, C, ...
          
          if (cell && cell.v !== undefined) {
            rowObj[colName] = String(cell.v);
            hasData = true;
          } else {
            rowObj[colName] = '';
          }
        }
        
        // 데이터가 있는 행만 추가
        if (hasData) {
          jsonData.push(rowObj);
        }
      }
      
      appendDebugInfo(`데이터 행 추출 성공: ${jsonData.length}개 행`);
      
      // JSON 변환 결과 샘플 보기
      if (jsonData.length > 0) {
        appendDebugInfo(`첫 번째 행 샘플: ${JSON.stringify(jsonData[0]).substring(0, 100)}...`);
      }
      
      totalRows += jsonData.length;
      appendDebugInfo(`시트 ${sheetName}의 총 행 수: ${jsonData.length}`);
      
      // 각 행 처리
      let processedForSheet = 0;
      jsonData.forEach(row => {
        // 필요한 데이터가 있는지 확인
        if (!row) {
          return; // 빈 행이면 건너뛰기
        }
        
        // 키 수가 너무 적으면 건너뛰기 (기존 27에서 5로 완화)
        if (Object.keys(row).length < 5) {
          filteredRows++;
          return;
        }
        
        // 트림 텍스트 가져오기 (Q열)
        const trimText = row['Q'] ? String(row['Q']) : '';
        
        // 데이터 추출
        const modelName = extractModelName(sheetName);
        const engine = determineEngine(sheetName, trimText);
        const trim = determineTrim(trimText);
        
        // 값 가져오기 함수
        const getValue = (key) => row[key] ? String(row[key]) : '';
        
        // 결과 행 생성
        const resultRow = {
          '차종': modelName,
          '엔진': engine,
          '트림': trim,
          '외장칼라': getValue('S'),
          '내장칼라': getValue('T'),
          '생산번호': getValue('J'),
          '출고센터': getValue('K'),
          '생산일': getValue('L'),
          '옵션': getValue('R'),
          '판매가격(만원)': getValue('U'),
          '기본조건': getValue('V'),
          '생산월조건': getValue('W'),
          '판촉차조건': getValue('X'),
          '페스타조건': getValue('Y'),
          '슈퍼세이브조건': getValue('Z'),
          '조건 계': getValue('AA')
        };
        
        // 유효한 데이터 행인지 확인
        if (isValidDataRow(resultRow)) {
          validRows++;
          allData.push(resultRow);
          processedForSheet++;
        } else {
          filteredRows++;
        }
      });
      
      appendDebugInfo(`시트 ${sheetName}에서 처리된 유효 데이터: ${processedForSheet}개`);
    });
    
    appendDebugInfo(`총 행 수: ${totalRows}, 필터링된 행 수: ${filteredRows}, 유효한 데이터 행 수: ${validRows}`);
    
    // CSV 데이터 생성
    if (allData.length > 0) {
      // 헤더 행 추가
      let csvContent = headers.map(header => `"${header}"`).join(',') + '\n';
      
      // 데이터 행 추가
      allData.forEach(row => {
        const csvRow = headers.map(header => `"${row[header] || ''}"`).join(',');
        csvContent += csvRow + '\n';
      });
      
      return {
        success: true,
        data: csvContent,
        count: allData.length
      };
    } else {
      return {
        success: false,
        error: '변환할 데이터가 없습니다. 업로드한 엑셀 파일의 형식을 확인해주세요.'
      };
    }
    
  } catch (error) {
    console.error('오류 발생:', error);
    return {
      success: false,
      error: `변환 중 오류 발생: ${error.message}`
    };
  }
} 