export function isSearchEngineCrawler() {
  const ua = navigator.userAgent.toLowerCase();

  const crawlers = {
    google:  /googlebot|google-inspectiontool/,
    bing:    /bingbot|msnbot/,
    yahoo:   /slurp/,               // Yahoo uses Slurp (powered by Bing)
    baidu:   /baiduspider/,
    yandex:  /yandexbot|yadirectfetcher/,
    else:   /bot|crawler|spider|crawling/i, // Generic bot patterns
  };

  for (const [engine, pattern] of Object.entries(crawlers)) {
    if (pattern.test(ua)) {
      return { isCrawler: true, engine };
    }
  }

  return { isCrawler: false, engine: null };
}
export default isSearchEngineCrawler;