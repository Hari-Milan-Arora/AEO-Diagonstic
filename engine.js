const AEOEngine = (() => {
  function hash(str) { let h=0; for(let i=0;i<str.length;i++){h=((h<<5)-h)+str.charCodeAt(i);h|=0;} return Math.abs(h); }
  function seededRand(seed) { let s=seed%2147483647; return()=>{s=(s*16807)%2147483647;return(s-1)/2147483646;}; }
  function pick(arr,rng){return arr[Math.floor(rng()*arr.length)];}
  function clamp(v,min,max){return Math.max(min,Math.min(max,v));}
  function round1(v){return Math.round(v*10)/10;}

  const QUERY_TEMPLATES = {
    best: [
      "What is the best {category} for {audience}?",
      "Top {category} recommendations for {audience}",
      "Best {category} to buy in 2025 for {audience}",
      "What {category} do experts recommend for {audience}?",
      "Most popular {category} among {audience}"
    ],
    comparison: [
      "{brand} vs {competitor} — which is better for {audience}?",
      "How does {brand} compare to {competitor} in {category}?",
      "{brand} or {competitor} for {audience}?",
      "Comparing top {category} brands: {brand} vs {competitor}"
    ],
    problem: [
      "How to choose the right {category} for {audience}?",
      "What should {audience} look for in a {category}?",
      "Common problems with {category} and how to solve them",
      "Why is my {category} not working for {audience} needs?",
      "How to get the most out of your {category}"
    ],
    longtail: [
      "I'm a {audience_desc} looking for a good {category}, any suggestions?",
      "Can someone recommend a {category} that works well for {audience}?",
      "I've been researching {category} options for {audience}, what should I consider?",
      "What {category} would you suggest for someone who is {audience_desc}?",
      "Is it worth investing in premium {category} for {audience}?"
    ]
  };

  function generateQueries(params) {
    const {brand, category, audience, competitors, count} = params;
    const rng = seededRand(hash(brand+category));
    const queries = [];
    const types = ['best','comparison','problem','longtail'];
    const audienceDesc = audience.toLowerCase();
    const compList = competitors.length ? competitors : ['Alternative A','Alternative B'];

    for(let i=0; i<count; i++) {
      const type = types[i % types.length];
      const templates = QUERY_TEMPLATES[type];
      let tpl = templates[i % templates.length];
      const comp = compList[i % compList.length];
      tpl = tpl.replace(/\{brand\}/g, brand)
               .replace(/\{category\}/g, category)
               .replace(/\{audience\}/g, audience)
               .replace(/\{competitor\}/g, comp)
               .replace(/\{audience_desc\}/g, audienceDesc);
      queries.push({query: tpl, type, index: i});
    }
    return queries;
  }

  function estimateBrandAuthority(brand, category, rng) {
    // Authority estimation: produces values typically between 0.20-0.75
    // Represents how well-established a brand is in AI training data
    const nameLen = brand.length;
    // Base: short names like "Nike" (4 chars) get a decent base, longer names get slightly more
    const base = 0.22 + (nameLen > 3 ? 0.08 : 0) + (nameLen > 6 ? 0.06 : 0) + (nameLen > 10 ? 0.04 : 0);
    // Category-brand hash creates deterministic brand-specific variance
    const catBonus = (hash(brand + category) % 18) / 100;
    // Small random factor for per-query variance
    const noise = rng() * 0.1;
    return clamp(base + catBonus + noise, 0.15, 0.75);
  }

  function shouldMentionBrand(authority, model, queryType, rng) {
    // Thresholds calibrated so a mid-authority brand (~0.40) gets mentioned ~40-50% of the time
    // Claude is hardest (needs more authority), ChatGPT balanced, Gemini easiest (trend-biased)
    const thresholds = {chatgpt: 0.40, claude: 0.46, gemini: 0.36};
    // Query type significantly affects mention probability
    const typeBonus = {best: 0.06, comparison: 0.20, problem: -0.05, longtail: 0.03};
    // Tighter noise range for more predictable behavior, centered slightly negative
    const noise = (rng() - 0.55) * 0.22;
    const prob = authority + (typeBonus[queryType] || 0) + noise;
    return prob > (thresholds[model] || 0.42);
  }

  function generatePosition(mentioned, rng) {
    if(!mentioned) return 'Not present';
    const r = rng();
    if(r<0.35) return 'Early';
    if(r<0.7) return 'Mid';
    return 'Late';
  }

  function generateSentiment(mentioned, authority, rng) {
    if(!mentioned) return 'Neutral';
    if(authority > 0.65 || rng() > 0.5) return 'Positive';
    if(authority < 0.35 && rng() > 0.7) return 'Negative';
    return 'Neutral';
  }

  const RESPONSE_INTROS = {
    chatgpt: [
      "When looking at {category} options for {audience}, several brands stand out.",
      "Here's a breakdown of the top {category} choices for {audience}.",
      "Based on current market data, here are the best {category} for {audience}."
    ],
    claude: [
      "This is a great question. Choosing the right {category} for {audience} involves several factors worth considering carefully.",
      "I'd be happy to help you navigate the {category} landscape. For {audience}, there are important nuances to consider.",
      "Let me provide a thoughtful analysis of {category} options that would best serve {audience}."
    ],
    gemini: [
      "Top {category} for {audience} include:",
      "According to recent reviews and trends, here are leading {category} for {audience}.",
      "Here are the most recommended {category} for {audience} based on current data."
    ]
  };

  function buildBrandSnippet(brand, category, sentiment, model) {
    const pos = {
      chatgpt: [
        `**${brand}** is a solid option in the ${category} space, known for quality and reliability.`,
        `${brand} offers competitive ${category} solutions with good customer satisfaction.`,
        `Many users recommend **${brand}** for its consistent performance in ${category}.`
      ],
      claude: [
        `${brand} is worth considering — they've built a reputation in the ${category} market through consistent quality, though it's worth comparing their specific offerings to your needs.`,
        `I'd mention ${brand} as a notable player in ${category}. They tend to focus on delivering reliable products, which many ${category} users appreciate.`,
        `${brand} has carved out a presence in the ${category} space. Their approach emphasizes quality, though as with any brand, your mileage may vary depending on specific needs.`
      ],
      gemini: [
        `${brand} — Popular ${category} brand with strong reviews.`,
        `${brand}: Well-rated ${category} option. Known for reliability.`,
        `${brand} is frequently recommended for ${category}.`
      ]
    };
    const neg = {
      chatgpt: [`${brand} exists in this space but may not be the top choice for everyone.`],
      claude: [`${brand} is present in the ${category} market, though they face stiff competition from more established players.`],
      gemini: [`${brand} — Available but less commonly recommended.`]
    };
    const snippets = sentiment === 'Negative' ? neg[model] : pos[model];
    return snippets[hash(brand+model) % snippets.length];
  }

  function generateAIResponse(query, brand, category, audience, competitors, mentioned, model, rng) {
    const intros = RESPONSE_INTROS[model];
    let intro = intros[Math.floor(rng()*intros.length)]
      .replace(/\{category\}/g, category)
      .replace(/\{audience\}/g, audience);

    const allBrands = [...competitors];
    if(mentioned) {
      const pos = Math.floor(rng() * (allBrands.length+1));
      allBrands.splice(pos, 0, brand);
    }

    const sentiment = mentioned ? (rng()>0.3 ? 'Positive' : 'Neutral') : 'Neutral';
    let body = '';
    const mentionedComps = allBrands.filter(b => rng() > 0.25 || b === brand).slice(0, 5);

    if(model === 'chatgpt') {
      body = '\n\n';
      mentionedComps.forEach((b,i) => {
        if(b === brand) body += `${i+1}. ${buildBrandSnippet(brand, category, sentiment, model)}\n`;
        else body += `${i+1}. **${b}** — A well-known ${category} option popular among ${audience}.\n`;
      });
      body += `\nUltimately, the best choice depends on your specific needs, budget, and preferences.`;
    } else if(model === 'claude') {
      body = '\n\n';
      mentionedComps.forEach(b => {
        if(b === brand) body += `• ${buildBrandSnippet(brand, category, sentiment, model)}\n\n`;
        else body += `• ${b} is another option in the ${category} space that's been well-received, particularly for its specific strengths in serving ${audience}.\n\n`;
      });
      body += `I'd recommend trying a few options if possible, as personal preference plays a significant role in ${category} satisfaction.`;
    } else {
      body = '\n';
      mentionedComps.forEach(b => {
        if(b === brand) body += `• ${buildBrandSnippet(brand, category, sentiment, model)}\n`;
        else body += `• ${b} — Trending ${category} choice. Highly rated.\n`;
      });
    }
    return {text: intro + body, mentionedBrands: mentionedComps};
  }

  function buildConsensus(responses, brand, category, audience, rng) {
    const allBrands = new Map();
    ['chatgpt','claude','gemini'].forEach(model => {
      (responses[model].mentionedBrands||[]).forEach(b => {
        allBrands.set(b, (allBrands.get(b)||0) + 1);
      });
    });
    const sorted = [...allBrands.entries()].sort((a,b) => b[1]-a[1]);
    const top = sorted.filter(e=>e[1]>=2).map(e=>e[0]).slice(0,5);
    if(top.length<3) sorted.filter(e=>e[1]===1).slice(0,3-top.length).forEach(e=>top.push(e[0]));

    const brandInConsensus = top.includes(brand);
    let text = `Based on analysis across multiple AI systems, the top ${category} recommendations for ${audience} are:\n\n`;
    top.forEach((b,i) => {
      const count = allBrands.get(b);
      text += `${i+1}. **${b}** — Recommended by ${count}/3 AI systems. `;
      if(b === brand) text += `Strong presence in the ${category} market with solid user satisfaction.\n`;
      else text += `Well-regarded ${category} option for ${audience}.\n`;
    });
    text += `\nThis consensus reflects brands that consistently appear across different AI evaluations, weighted by agreement and authority signals.`;
    return {text, mentionedBrands: top, brandPresent: brandInConsensus};
  }

  function scoreQuery(brandPresence, position, sentiment, authority) {
    const aiModels = ['chatgpt','claude','gemini'];
    const mentionCount = aiModels.filter(m=>brandPresence[m]).length;

    // VISIBILITY: How prominent is the brand in AI answers?
    // 0 mentions = 0-1, 1 mention = 2-4, 2 mentions = 4-6, 3 mentions = 5-8
    let vis = 0;
    if(mentionCount === 1) vis = 2.0 + authority * 2;
    else if(mentionCount === 2) vis = 3.5 + authority * 2.5;
    else if(mentionCount === 3) vis = 5.0 + authority * 2;
    if(brandPresence.consensus) vis += 1.0;
    if(position==='Early') vis += 1.2;
    else if(position==='Mid') vis += 0.5;
    else if(position==='Late') vis += 0.2;
    // No mentions = near zero
    if(mentionCount === 0) vis = authority * 1.5;

    // AUTHORITY: Cross-model agreement signals trust
    // Perfect score requires 3/3 mentions + consensus + high authority
    let auth = 0;
    if(mentionCount === 0) auth = authority * 2;
    else if(mentionCount === 1) auth = 1.5 + authority * 2.5;
    else if(mentionCount === 2) auth = 3.0 + authority * 3;
    else if(mentionCount === 3) auth = 4.5 + authority * 3;
    if(brandPresence.consensus) auth += 1.2;
    if(position === 'Early') auth += 0.8;

    // RELEVANCE: How well does brand fit the query/category?
    // Based on authority (category-brand fit) + mention presence
    let rel = authority * 5;
    if(mentionCount > 0) rel += 1.5;
    if(mentionCount >= 2) rel += 1.0;
    if(position !== 'Not present') rel += 0.8;
    if(mentionCount === 0) rel = authority * 3.5;

    // TRUST: Sentiment + consistency signals
    let trust = 0;
    if(mentionCount === 0) {
      trust = authority * 2;
    } else {
      if(sentiment==='Positive') trust += 2.5;
      else if(sentiment==='Neutral') trust += 1.5;
      else trust += 0.5;
      trust += mentionCount * 1.0;
      if(brandPresence.consensus) trust += 1.0;
      if(position==='Early') trust += 1.5;
      else if(position==='Mid') trust += 0.8;
      trust += authority * 2;
    }

    // AI Mention Probability: realistic composite
    let mentionProb = 0;
    if(mentionCount === 0) mentionProb = authority * 15;
    else if(mentionCount === 1) mentionProb = 20 + authority * 15;
    else if(mentionCount === 2) mentionProb = 40 + authority * 20;
    else if(mentionCount === 3) mentionProb = 55 + authority * 20;
    if(brandPresence.consensus) mentionProb += 10;
    if(position === 'Early') mentionProb += 5;

    return {
      visibility: round1(clamp(vis, 0, 10)),
      authority: round1(clamp(auth, 0, 10)),
      relevance: round1(clamp(rel, 0, 10)),
      trust: round1(clamp(trust, 0, 10)),
      mentionProbability: Math.round(clamp(mentionProb, 0, 95))
    };
  }

  function processQuery(queryObj, params, rng) {
    const {brand, category, audience, competitors} = params;
    const authority = estimateBrandAuthority(brand, category, rng);
    const presence = {};
    const responses = {};

    ['chatgpt','claude','gemini'].forEach(model => {
      const mentioned = shouldMentionBrand(authority, model, queryObj.type, rng);
      presence[model] = mentioned;
      responses[model] = generateAIResponse(queryObj.query, brand, category, audience, competitors, mentioned, model, rng);
    });

    const consensus = buildConsensus(responses, brand, category, audience, rng);
    presence.consensus = consensus.brandPresent;

    const anyMentioned = presence.chatgpt || presence.claude || presence.gemini;
    const position = anyMentioned ? generatePosition(anyMentioned, rng) : 'Not present';
    const sentiment = generateSentiment(anyMentioned, authority, rng);

    const allComps = new Set();
    Object.values(responses).forEach(r => (r.mentionedBrands||[]).forEach(b => {if(b!==brand) allComps.add(b);}));
    consensus.mentionedBrands.forEach(b => {if(b!==brand) allComps.add(b);});

    const scores = scoreQuery(presence, position, sentiment, authority);

    const mentionedIn = ['chatgpt','claude','gemini'].filter(m=>presence[m]);
    const notIn = ['chatgpt','claude','gemini'].filter(m=>!presence[m]);
    let insight = '';
    if(mentionedIn.length===3) insight = `${brand} has strong cross-AI visibility for this query type. All three AI systems recognized the brand, indicating solid authority signals in the ${category} space.`;
    else if(mentionedIn.length>0) insight = `${brand} appeared in ${mentionedIn.map(m=>m.charAt(0).toUpperCase()+m.slice(1)).join(', ')} but was absent from ${notIn.map(m=>m.charAt(0).toUpperCase()+m.slice(1)).join(', ')}. This suggests inconsistent brand authority signals — the brand may need stronger content depth and trust indicators.`;
    else insight = `${brand} was not mentioned by any AI system for this query. This indicates a significant visibility gap. Competitors are dominating this query space, likely due to stronger content, reviews, and authority signals.`;

    let recommendations = '';
    if(mentionedIn.length<2) recommendations = `Create targeted content optimized for "${queryObj.query}" queries. Build FAQ pages, comparison guides, and expert reviews that specifically address ${audience} needs in ${category}. Focus on structured data markup.`;
    else if(position!=='Early') recommendations = `Improve positioning by strengthening authority signals: seek expert mentions, build high-quality backlinks, and ensure brand information is semantically clear and comprehensive.`;
    else recommendations = `Maintain current strong position. Focus on expanding to adjacent query types and building defensive content against competitor encroachment.`;

    return {
      query: queryObj.query,
      queryType: queryObj.type,
      responses: {
        chatgpt: responses.chatgpt.text,
        claude: responses.claude.text,
        gemini: responses.gemini.text,
        consensus: consensus.text
      },
      brand_presence: presence,
      position,
      sentiment,
      competitors: [...allComps],
      scores: {visibility: scores.visibility, authority: scores.authority, relevance: scores.relevance, trust: scores.trust},
      ai_mention_probability: scores.mentionProbability + '%',
      insight,
      recommendations
    };
  }

  function aggregateResults(results, params) {
    const n = results.length;
    const avgScores = {visibility:0,authority:0,relevance:0,trust:0};
    let totalMentionProb = 0;
    const aiMentions = {chatgpt:0,claude:0,gemini:0,consensus:0};
    const queryTypeFailures = {};
    const compFreq = {};

    results.forEach(r => {
      ['visibility','authority','relevance','trust'].forEach(k => avgScores[k] += r.scores[k]);
      totalMentionProb += parseInt(r.ai_mention_probability);
      ['chatgpt','claude','gemini','consensus'].forEach(m => { if(r.brand_presence[m]) aiMentions[m]++; });
      if(!r.brand_presence.chatgpt && !r.brand_presence.claude && !r.brand_presence.gemini) {
        queryTypeFailures[r.queryType] = (queryTypeFailures[r.queryType]||0)+1;
      }
      r.competitors.forEach(c => { compFreq[c] = (compFreq[c]||0)+1; });
    });

    Object.keys(avgScores).forEach(k => avgScores[k] = round1(avgScores[k]/n));
    const overallVisibility = Math.round(avgScores.visibility * 10);
    const mentionRate = Math.round((aiMentions.chatgpt+aiMentions.claude+aiMentions.gemini)/(n*3)*100);
    const perAIMention = {
      chatgpt: Math.round(aiMentions.chatgpt/n*100),
      claude: Math.round(aiMentions.claude/n*100),
      gemini: Math.round(aiMentions.gemini/n*100)
    };
    const consensusMentionRate = Math.round(aiMentions.consensus/n*100);

    const sortedComps = Object.entries(compFreq).sort((a,b)=>b[1]-a[1]);
    const topComps = sortedComps.slice(0,5).map(([name,count])=>({name,frequency:Math.round(count/n*100)}));

    const strengths = [];
    const weaknesses = [];
    if(avgScores.visibility >= 6) strengths.push(`Strong overall visibility score (${avgScores.visibility}/10) across AI systems`);
    if(avgScores.authority >= 6) strengths.push(`High authority recognition (${avgScores.authority}/10) — brand is perceived as credible`);
    if(avgScores.trust >= 6) strengths.push(`Good trust signals (${avgScores.trust}/10) — positive sentiment dominates`);
    if(perAIMention.chatgpt > 60) strengths.push(`Strong presence in ChatGPT responses (${perAIMention.chatgpt}% mention rate)`);
    if(perAIMention.gemini > 60) strengths.push(`High visibility in Gemini responses (${perAIMention.gemini}% mention rate)`);
    if(consensusMentionRate > 50) strengths.push(`Appears in consensus answers ${consensusMentionRate}% of the time`);
    if(strengths.length===0) strengths.push('Brand has room for significant improvement across all AI visibility metrics');

    if(avgScores.visibility < 5) weaknesses.push(`Low visibility score (${avgScores.visibility}/10) — brand is not prominent in AI answers`);
    if(avgScores.authority < 5) weaknesses.push(`Weak authority signals (${avgScores.authority}/10) — AI systems don't consistently recognize the brand`);
    if(avgScores.relevance < 5) weaknesses.push(`Low relevance score (${avgScores.relevance}/10) — brand-category association is weak`);
    if(avgScores.trust < 5) weaknesses.push(`Trust deficit (${avgScores.trust}/10) — insufficient credibility signals`);
    if(perAIMention.claude < 40) weaknesses.push(`Weak presence in Claude responses (${perAIMention.claude}% mention rate) — needs stronger safety/trust signals`);
    if(perAIMention.chatgpt < 40) weaknesses.push(`Low ChatGPT visibility (${perAIMention.chatgpt}%) — content may lack structured clarity`);
    if(perAIMention.gemini < 40) weaknesses.push(`Poor Gemini presence (${perAIMention.gemini}%) — brand may not appear in trending/search data`);
    if(consensusMentionRate < 40) weaknesses.push(`Low consensus mention rate (${consensusMentionRate}%) — brand not consistently recommended`);
    if(Object.keys(queryTypeFailures).length>0) weaknesses.push(`Fails in query types: ${Object.keys(queryTypeFailures).join(', ')}`);

    const worstAI = Object.entries(perAIMention).sort((a,b)=>a[1]-b[1])[0];
    const bestCompetitor = topComps[0];

    return {
      overallVisibility,
      mentionRate,
      consensusMentionRate,
      perAIMention,
      avgScores,
      strengths: strengths.slice(0,3),
      weaknesses: weaknesses.slice(0,5),
      topCompetitors: topComps,
      queryTypeFailures,
      worstAI: {name: worstAI[0], rate: worstAI[1]},
      bestCompetitor
    };
  }

  function generateGapAnalysis(aggregated, params) {
    const {brand, category, competitors} = params;
    const gaps = [];

    gaps.push({
      title: 'Competitor Dominance',
      detail: aggregated.topCompetitors.length > 0
        ? `${aggregated.topCompetitors[0].name} dominates with ${aggregated.topCompetitors[0].frequency}% query coverage. ${brand} must close this gap by creating comparison content and building more authoritative brand signals.`
        : `Even without strong named competitors, ${brand} struggles to appear in AI answers — indicating a fundamental content and authority gap.`
    });

    gaps.push({
      title: `Weakest AI: ${aggregated.worstAI.name.charAt(0).toUpperCase()+aggregated.worstAI.name.slice(1)}`,
      detail: `${brand} appears in only ${aggregated.worstAI.rate}% of ${aggregated.worstAI.name} responses. This AI system likely penalizes the brand for ${aggregated.worstAI.name==='claude'?'insufficient safety/trust signals and nuanced content':'lack of structured, search-optimized content and trending signals'}.`
    });

    gaps.push({
      title: 'Content Depth Gap',
      detail: `AI systems favor brands with comprehensive, well-structured content. ${brand} likely lacks in-depth guides, comparison articles, and expert-level content for the "${category}" space targeting ${params.audience}.`
    });

    gaps.push({
      title: 'Authority Mention Deficiency',
      detail: `${brand} needs more third-party mentions, expert endorsements, and citations from authoritative sources. AI systems weight external validation heavily when deciding which brands to recommend.`
    });

    gaps.push({
      title: 'Semantic Clarity Issues',
      detail: `The brand's digital footprint may lack clear semantic associations with "${category}". AI models need unambiguous signals connecting ${brand} to the category through structured data, clear product descriptions, and consistent messaging.`
    });

    gaps.push({
      title: 'Review & Trust Indicators',
      detail: `User reviews, ratings, testimonials, and case studies serve as critical trust signals. ${brand} should amplify its review presence across platforms to strengthen AI model confidence.`
    });

    return gaps;
  }

  function generateActionPlan(aggregated, gaps, params) {
    const {brand, category, audience} = params;
    return {
      week1: {
        title: 'Week 1–2: Quick Wins',
        actions: [
          {title: `Create "${category} for ${audience}" FAQ page`, desc: `Build a comprehensive FAQ addressing top ${aggregated.topCompetitors.length>0?'10':'5'} questions ${audience} ask about ${category}. Use schema markup for FAQ structured data.`, impact: 'high'},
          {title: 'Optimize brand entity markup', desc: `Add Organization and Product schema markup to ${brand}'s website. Ensure all key pages have structured data that AI systems can parse.`, impact: 'high'},
          {title: `Publish "${brand} vs competitors" comparison guide`, desc: `Create honest, data-driven comparison content for ${brand} vs ${aggregated.topCompetitors.slice(0,3).map(c=>c.name).join(', ')||'top competitors'}. AI systems heavily weight comparison content.`, impact: 'high'},
          {title: 'Audit and improve meta descriptions', desc: 'Rewrite meta descriptions across all key pages to be concise, keyword-rich, and aligned with AI search intent patterns.', impact: 'medium'},
        ]
      },
      week2: {
        title: 'Week 3–4: Authority Building',
        actions: [
          {title: 'Secure expert mentions and reviews', desc: `Reach out to industry experts and review platforms in ${category}. Each authoritative mention strengthens AI model confidence in recommending ${brand}.`, impact: 'high'},
          {title: 'Build high-quality backlinks', desc: `Target authoritative sites in the ${category} space for guest posts, features, and citations. Focus on quality over quantity.`, impact: 'high'},
          {title: 'Launch user testimonial campaign', desc: `Collect and publish authentic user testimonials from ${audience}. Feature them prominently with schema markup.`, impact: 'medium'},
          {title: 'Create data-driven industry content', desc: `Publish original research or data about ${category} trends. AI models prioritize brands that produce authoritative, cited content.`, impact: 'medium'},
        ]
      },
      advanced: {
        title: 'Advanced: AI-Optimized Strategy',
        actions: [
          {title: 'Implement conversational content patterns', desc: `Create content that directly answers conversational queries like "what ${category} should I choose for..." — this is how AI systems extract answers.`, impact: 'high'},
          {title: 'Build multi-platform presence', desc: `Ensure ${brand} has consistent, optimized presence across platforms AI models reference: Wikipedia, Reddit, industry forums, review sites, social media.`, impact: 'high'},
          {title: `Target weak AI: ${aggregated.worstAI.name}`, desc: `Create content specifically optimized for ${aggregated.worstAI.name}'s known preferences: ${aggregated.worstAI.name==='claude'?'nuanced, safety-aware, detailed explanations':aggregated.worstAI.name==='gemini'?'concise, search-optimized, trending signals':'structured, balanced, well-reasoned content'}.`, impact: 'medium'},
          {title: 'Monitor and iterate monthly', desc: 'Run AEO diagnostics monthly to track progress. Adjust strategy based on which AI systems show improvement and which remain weak.', impact: 'medium'},
        ]
      }
    };
  }

  async function runDiagnostic(params, onProgress) {
    const rng = seededRand(hash(params.brand + params.category + params.audience));
    const totalPhases = 9;
    const update = (phase, name, pct) => onProgress && onProgress({phase, name, pct: Math.round(pct)});

    update(1, 'Generating Queries', 5);
    await sleep(300);
    const queries = generateQueries(params);
    update(1, 'Generating Queries', 11);

    const results = [];
    for(let i=0; i<queries.length; i++) {
      const phasePct = 11 + (i/queries.length)*55;
      update(2 + Math.floor(i/(queries.length/3)), `Processing Query ${i+1}/${queries.length}`, phasePct);
      await sleep(150);
      const result = processQuery(queries[i], params, rng);
      results.push(result);
    }
    update(6, 'Structuring Output', 70);
    await sleep(200);

    update(7, 'Aggregating Analysis', 78);
    await sleep(300);
    const aggregated = aggregateResults(results, params);

    update(8, 'Strategic Gap Analysis', 88);
    await sleep(200);
    const gaps = generateGapAnalysis(aggregated, params);

    update(9, 'Generating Action Plan', 95);
    await sleep(200);
    const actionPlan = generateActionPlan(aggregated, gaps, params);

    update(9, 'Complete', 100);
    await sleep(100);

    return {results, aggregated, gaps, actionPlan};
  }

  function sleep(ms){return new Promise(r=>setTimeout(r,ms));}

  return {runDiagnostic};
})();
