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
    parseFloat(price.replace(/,/g, ''));
  } catch (e) {
    hasValidPrice = false;
  }
  
  // 엔진 타입이 의미 있는 값인지 확인
  const engine = String(rowData['엔진'] || '').trim();
  const hasValidEngine = engine !== '' && 
                        ['하이브리드', '전기', '가솔린', 'Lpi'].includes(engine) && 
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
  
  // 모든 조건을 만족해야 유효한 행으로 간주
  return hasValidProductionNumber && 
         hasValidPrice && 
         isNotHeader && 
         hasValidCenter && 
         hasValidOptions && 
         hasValidEngine;
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
    // 모든 시트 처리
    workbook.SheetNames.forEach(sheetName => {
      console.log(`시트 처리 중: ${sheetName}`);
      const worksheet = workbook.Sheets[sheetName];
      
      // 엑셀 시트를 JSON으로 변환
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 'A' });
      
      // 각 행 처리
      jsonData.forEach(row => {
        // 필요한 데이터가 있는지 확인
        if (!row || Object.keys(row).length < 27) {
          return; // 필요한 열이 없으면 건너뛰기
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
          allData.push(resultRow);
        }
      });
    });
    
    console.log(`유효한 데이터 행 수: ${allData.length}개`);
    
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
        error: '변환할 데이터가 없습니다.'
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