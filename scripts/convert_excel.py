import pandas as pd
import os
import csv
import sys
from pathlib import Path

def extract_model_name(sheet_name):
    """시트 이름에서 차종 이름을 추출합니다."""
    if '쏘나타' in sheet_name:
        return '쏘나타'
    elif '코나' in sheet_name:
        return '코나'
    elif '그랜저' in sheet_name:
        return '그랜저'
    elif '투싼' in sheet_name:
        return '투싼'
    elif '싼타페' in sheet_name:
        return '싼타페'
    elif '아이오닉5' in sheet_name:
        return '아이오닉5'
    elif '아이오닉6' in sheet_name:
        return '아이오닉6'
    # 여기에 다른 차종 규칙 추가
    return sheet_name

def determine_engine(sheet_name, trim_text):
    """엔진 타입을 결정합니다."""
    # 차종 추출
    model_name = extract_model_name(sheet_name)
    
    # 아이오닉5, 아이오닉6는 항상 '전기' 반환
    if model_name == '아이오닉5' or model_name == '아이오닉6':
        return '전기'
    
    if 'HEV' in sheet_name:
        return '하이브리드'
    elif 'EV' in sheet_name:
        return '전기'
    elif trim_text and '가솔린' in trim_text:
        return '가솔린'
    elif trim_text and 'Lpi' in trim_text:
        return 'Lpi'
    # 다른 엔진 타입이 있다면 추가
    return ''

def determine_trim(trim_text):
    """트림을 결정합니다."""
    if not trim_text:
        return ''
    
    if 'N Line' in trim_text:
        return 'N Line'
    elif '익스클루시브' in trim_text:
        return '익스클루시브'
    elif '인스퍼레이션' in trim_text:
        return '인스퍼레이션'
    elif '프레스티지' in trim_text:
        return '프레스티지'
    elif '프리미엄' in trim_text:
        return '프리미엄'
    elif '롱레인지' in trim_text:
        return '롱레인지'
    elif '캘리그래피' in trim_text:
        return '캘리그래피'
    # 다른 트림이 있다면 추가
    return ''

def is_valid_data_row(row_data):
    """실제 데이터가 있는 행인지 확인합니다."""
    # 생산번호가 유효한지 확인 (특정 패턴이나 숫자가 포함된 문자열이어야 함)
    production_num = str(row_data['생산번호']).strip()
    has_valid_production_number = production_num != '' and not production_num.lower() == '생산번호'
    
    # 판매가격이 실제 숫자인지 확인
    price = str(row_data['판매가격(만원)']).strip()
    has_valid_price = price != '' and not price.lower() == '판매가' and not price.lower() == '판매가격' and not price.lower() == '판매가격(만원)'
    
    try:
        # 숫자로 변환 가능한지 확인
        float(price.replace(',', ''))
    except:
        has_valid_price = False
    
    # 엔진 타입이 의미 있는 값인지 확인
    engine = str(row_data['엔진']).strip()
    has_valid_engine = engine != '' and engine in ['하이브리드', '전기', '가솔린', 'Lpi'] and engine.lower() != '엔진'
    
    # 차종이 헤더가 아닌지 확인
    model = str(row_data['차종']).strip()
    is_not_header = model != '' and not model.lower() == '차종'
    
    # 출고센터가 실제 값인지 확인
    center = str(row_data['출고센터']).strip()
    has_valid_center = center != '' and not center.lower() == '출고센터'
    
    # 옵션 필드에 실제 내용이 있는지 확인
    options = str(row_data['옵션']).strip()
    has_valid_options = options != '' and not options.lower() == '옵션'
    
    # 모든 조건을 만족해야 유효한 행으로 간주
    is_valid = (has_valid_production_number and has_valid_price and is_not_header and 
                has_valid_center and has_valid_options and has_valid_engine)
    
    return is_valid

def convert_excel_to_csv(excel_file_path, output_file_path=None):
    """엑셀 파일을 CSV로 변환합니다."""
    # Path 객체로 변환
    excel_file = Path(excel_file_path)
    
    if not excel_file.exists():
        print(f'파일 {excel_file}을 찾을 수 없습니다.')
        return False
    
    # 출력 파일 경로가 지정되지 않은 경우, 프로그램 실행 위치에 동일한 파일명으로 .csv 확장자 사용
    if output_file_path is None:
        output_file_path = Path(os.getcwd()) / f"{excel_file.stem}.csv"
    else:
        output_file_path = Path(output_file_path)
    
    print(f'파일 {excel_file}을 처리합니다...')
    print(f'출력 경로: {output_file_path}')
    
    # 결과 데이터를 저장할 리스트
    all_data = []
    filtered_by_ab_column = 0  # AB열(비고) 값이 '1'이어서 필터링된 행 수
    
    # 헤더 정의 - AB열(비고)값은 필터링 용도로만 사용하고 CSV에는 포함시키지 않음
    headers = ["차종","엔진","트림","외장칼라","내장칼라","생산번호","출고센터","생산일","옵션","판매가격(만원)","기본조건","생산월조건","판촉차조건","페스타조건","슈퍼세이브조건","조건 계"]
    
    try:
        # 엑셀 파일의 모든 시트 읽기
        excel = pd.ExcelFile(excel_file)
        
        # 각 시트 처리
        for sheet_name in excel.sheet_names:
            print(f'시트 처리 중: {sheet_name}')
            df = pd.read_excel(excel, sheet_name=sheet_name)
            
            # 필요한 컬럼이 있는지 확인 - 엑셀의 열 이름이 아니라 열 위치로 접근
            columns = df.columns
            if len(columns) < 28:  # AB 열까지 있어야 함
                print(f'경고: 시트 {sheet_name}에 필요한 컬럼이 없습니다.')
                continue
            
            # 열 이름 대신 숫자 인덱스로 접근
            # 각 행 처리
            for _, row in df.iterrows():
                # 트림 텍스트 가져오기 (Q열 = 16번째 열)
                if len(columns) > 16:
                    trim_text = str(row.iloc[16] if not pd.isna(row.iloc[16]) else '')
                else:
                    trim_text = ''
                
                # 데이터 추출
                model_name = extract_model_name(sheet_name)
                engine = determine_engine(sheet_name, trim_text)
                trim = determine_trim(trim_text)
                
                # 값이 있는지 확인하고 가져오기
                def get_value(index):
                    if index < len(row) and not pd.isna(row.iloc[index]):
                        return row.iloc[index]
                    return ''
                
                # 결과 행 생성
                result_row = {
                    '차종': model_name,
                    '엔진': engine,
                    '트림': trim,
                    '외장칼라': get_value(18),  # S열 (18번째)
                    '내장칼라': get_value(19),  # T열 (19번째)
                    '생산번호': get_value(9),   # J열 (9번째)
                    '출고센터': get_value(10),  # K열 (10번째)
                    '생산일': get_value(11),    # L열 (11번째)
                    '옵션': get_value(17),      # R열 (17번째)
                    '판매가격(만원)': get_value(20),  # U열 (20번째)
                    '기본조건': get_value(21),  # V열 (21번째)
                    '생산월조건': get_value(22),  # W열 (22번째)
                    '판촉차조건': get_value(23),  # X열 (23번째)
                    '페스타조건': get_value(24),  # Y열 (24번째)
                    '슈퍼세이브조건': get_value(25),  # Z열 (25번째)
                    '조건 계': get_value(26)     # AA열 (26번째)
                }
                
                # AB열(비고) 값 확인 (27번째 열)
                ab_value = get_value(27)
                # AB열(비고)에 '1' 값이 없으면 이 행을 건너뜀
                if str(ab_value).strip() != '1' and str(ab_value).strip() != 1:
                    filtered_by_ab_column += 1
                    continue
                
                # 유효한 데이터 행인지 확인
                if is_valid_data_row(result_row):
                    all_data.append(result_row)
        
        print(f'유효한 데이터 행 수: {len(all_data)}개')
        print(f'AB열(비고) 값이 "1"이어서 필터링된 행 수: {filtered_by_ab_column}개')
        
        # 전체 데이터를 CSV로 저장 (csv 모듈 사용)
        if all_data:
            with open(output_file_path, 'w', newline='', encoding='utf-8-sig') as f:
                writer = csv.DictWriter(f, fieldnames=headers, quoting=csv.QUOTE_ALL)
                writer.writeheader()
                writer.writerows(all_data)
            print(f'{output_file_path} 파일이 생성되었습니다. (전체 데이터 {len(all_data)}행)')
            return True
        else:
            print('변환할 데이터가 없습니다.')
            return False
        
    except Exception as e:
        print(f'오류 발생: {str(e)}')
        import traceback
        traceback.print_exc()
        return False

def main():
    """프로그램의 주 실행 함수. 현재 디렉토리의 모든 엑셀 파일을 변환합니다."""
    # 현재 디렉토리에서 모든 엑셀 파일 찾기
    excel_files = list(Path('.').glob('*.xlsx'))
    
    if not excel_files:
        print('현재 디렉토리에서 변환할 엑셀 파일을 찾을 수 없습니다.')
        return
    
    print(f'총 {len(excel_files)}개의 엑셀 파일을 변환합니다...')
    
    success_count = 0
    
    # 각 엑셀 파일을 순차적으로 변환
    for excel_file in excel_files:
        # 출력 파일은 현재 디렉토리에 동일한 이름으로 .csv 확장자로 저장
        output_file = Path(os.getcwd()) / f"{excel_file.stem}.csv"
        
        print(f'\n파일 변환 중: {excel_file.name} -> {output_file.name}')
        
        result = convert_excel_to_csv(str(excel_file), str(output_file))
        if result:
            success_count += 1
    
    print(f'\n변환 완료: {success_count}/{len(excel_files)} 파일 변환 성공')

if __name__ == '__main__':
    main() 