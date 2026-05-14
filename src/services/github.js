import * as db from '../storage/db.js'

export async function buscarIssues(repo, token, page = 1) {
  const result = await fetch(
    `https://api.github.com/repos/${repo}/issues?state=open&per_page=20&page=${page}?access_token=${token}`,
  )
    .then((res) => {
      switch (res.status) {
        case 401:
          throw new Error('401 - Invalid Token!');
        case 403: {
          const rateLimit = res.headers.get('X-RateLimit-Reset') * 1000;
          const resetTime = new Date(rateLimit);
          throw new Error(
            `403 - Rate Limit reached! Wait until ${resetTime.toTimeString()} to try again.`,
          );
        }
        case 404:
          throw new Error(`404 - Repository ${repo} not found!`);
        default:
          return res;
      }
    })
    .catch((err) => {
      if (!(err instanceof Error)) {
        err = new Error(err);
      }
      console.error(err);
    });
  const issues = await result.json();
  const hasNextPage = (a = result.headers.entries()) => {
    for (const pair of a) {
      if (pair[0] == 'link') return pair[1].includes('rel="next"');
    }
    return false
  };
  const rateLimit = result.headers.get('X-RateLimit-Reset') * 1000;
  const resetTime = new Date(rateLimit);

  let fullIssues = [];

  for (let i = 0; i < issues.length; i++) {
    const nextIssue = {
      titulo: issues[i].title,
      tags: issues[i].labels.map((l) => l.name),
      descricao: issues[i].body?.slice(0, 200),
      status: 'pendente',
      prioridade: 'media',
    };
    await db.adicionarTask(nextIssue)
    fullIssues.push(nextIssue);
  }
  console.log(fullIssues)
  return {
    issues: fullIssues,
    hasNextPage: hasNextPage(),
  };
}
