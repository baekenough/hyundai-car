const { Octokit } = require("@octokit/rest");

exports.handler = async function (event, context) {
  // GitHub 인증 정보
  const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN,
  });

  // GitHub 저장소 정보
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const path = "data.csv";

  try {
    // 현재 파일의 SHA 가져오기
    const { data: currentFile } = await octokit.repos.getContent({
      owner,
      repo,
      path,
    });

    // CSV 내용 업데이트
    const response = await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path,
      message: "Update CSV file",
      content: Buffer.from(JSON.parse(event.body).content).toString("base64"),
      sha: currentFile.sha,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "CSV file updated successfully" }),
    };
  } catch (error) {
    console.error("Error updating CSV file:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to update CSV file" }),
    };
  }
};
