import pandas as pd
import os
from pathlib import Path

# 현재 폴더의 모든 xlsx 파일 찾기
excel_files = list(Path('.').glob('*.xlsx'))

if not excel_files:
    print('엑셀 파일(.xlsx)을 찾을 수 없습니다.')
    exit()

# 필요한 헤더
headers = [
    '차종', '엔진', '트림', '외장칼라', '내장칼라', 
    '생산번호', '출고센터', '생산일', '옵션', 
    '판매가격(만원)', '기본조건', '생산월조건', 
    '판촉차조건', '페스타조건', '슈퍼세이브조건', 
    '조건 계'
]

# 각 엑셀 파일 처리
for excel_file in excel_files:
    print(f'처리 중: {excel_file.name}')
    
    try:
        # 엑셀 파일의 모든 시트 읽기
        excel = pd.ExcelFile(excel_file)
        all_data = []
        
        # 각 시트 처리
        for sheet_name in excel.sheet_names:
            df = pd.read_excel(excel, sheet_name=sheet_name)
            
            # 필요한 컬럼만 선택
            for col in headers:
                if col not in df.columns:
                    df[col] = ''
            
            # 필요한 컬럼만 선택하고 순서 맞추기
            df = df[headers]
            all_data.append(df)
        
        # 모든 데이터 합치기
        final_df = pd.concat(all_data, ignore_index=True)
        
        # CSV 파일 이름 생성 (확장자만 변경)
        csv_file = excel_file.with_suffix('.csv')
        
        # CSV로 저장 (UTF-8 with BOM)
        final_df.to_csv(csv_file, index=False, encoding='utf-8-sig')
        print(f'완료: {csv_file.name} 생성됨')
        
    except Exception as e:
        print(f'오류 발생: {excel_file.name} 처리 중 실패')
        print(str(e))

print('\n모든 파일 변환이 완료되었습니다.') 