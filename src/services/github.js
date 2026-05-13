

export async function buscarIssues(repo, token, page=1) {
    try {
    const result = await fetch(`https://api.github.com/repos/${repo}/issues?state=open&per_page=20&page=${page}?access_token=${token}`)
    const issues = await result.json()
    const hasNextPage = await result.headers.link.includes(`rel="next"`)
    console.log(result)
    console.log(hasNextPage)
    } catch (err) {
        console.log(err)
    }
}

await buscarIssues('cypress-io/cypress', process.env.GITHUB_TOKEN)


