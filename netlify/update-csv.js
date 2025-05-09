const { Octokit } = require("@octokit/rest");

exports.handler = async function (event, context) {
  console.log("함수 호출됨, 이벤트 메서드:", event.httpMethod);
  
  // GitHub 토큰 확인
  const githubToken = process.env.GITHUB_TOKEN;
  if (!githubToken) {
    console.warn("환경 변수에 GITHUB_TOKEN이 설정되지 않았습니다. 기본 토큰을 사용합니다.");
  }

  // GitHub 인증 정보
  const octokit = new Octokit({
    auth: githubToken || "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",
  });

  // GitHub 저장소 정보
  const owner = process.env.GITHUB_OWNER || "baekenough";
  const repo = process.env.GITHUB_REPO || "hyundai-car";
  const path = "data.csv";
  
  console.log("GitHub 저장소 정보:", owner, repo, path);

  try {
    // OPTIONS 요청 처리 (CORS preflight)
    if (event.httpMethod === "OPTIONS") {
      return {
        statusCode: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
        },
      };
    }

    // POST 요청이 아닌 경우 거부
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: "Method not allowed" }),
      };
    }

    // 요청 본문 파싱
    let requestBody;
    try {
      requestBody = JSON.parse(event.body);
      if (!requestBody.content) {
        throw new Error("content 필드가 필요합니다");
      }
      console.log("요청 데이터 크기:", requestBody.content.length, "바이트");
    } catch (parseError) {
      console.error("요청 본문 파싱 오류:", parseError);
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          error: "잘못된 요청 형식", 
          details: parseError.message,
          received: event.body.substring(0, 100) + "..."
        }),
      };
    }

    // 현재 파일의 SHA 가져오기
    let currentFile;
    try {
      const fileResponse = await octokit.repos.getContent({
        owner,
        repo,
        path,
      });
      currentFile = fileResponse.data;
      console.log("기존 파일 SHA:", currentFile.sha);
    } catch (fileError) {
      console.error("파일 정보 조회 오류:", fileError.message);
      // 파일이 없는 경우 새로 생성
      if (fileError.status === 404) {
        console.log("파일이 존재하지 않아 새로 생성합니다.");
        currentFile = null;
      } else {
        return {
          statusCode: 500,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            error: "GitHub 파일 접근 오류",
            details: fileError.message
          }),
        };
      }
    }

    // 내용 인코딩
    const content = Buffer.from(requestBody.content).toString("base64");
    console.log("Base64 인코딩 완료, 크기:", content.length, "바이트");

    // CSV 내용 업데이트
    try {
      const updateResponse = await octokit.repos.createOrUpdateFileContents({
        owner,
        repo,
        path,
        message: "Update CSV file via web app",
        content: content,
        sha: currentFile ? currentFile.sha : undefined,
      });

      console.log("GitHub 응답:", updateResponse.status, updateResponse.data.commit.sha);
      
      return {
        statusCode: 200,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify({ 
          message: "CSV file updated successfully",
          commit: updateResponse.data.commit.sha
        }),
      };
    } catch (updateError) {
      console.error("파일 업데이트 오류:", updateError.message);
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          error: "Failed to update file on GitHub", 
          details: updateError.message
        }),
      };
    }
  } catch (error) {
    console.error("Error updating CSV file:", error.message, error.stack);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        error: "Failed to update CSV file", 
        message: error.message,
        stack: error.stack
      }),
    };
  }
};
