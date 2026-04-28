export interface Template {
  id: string;
  label: string;
  prompt: string;
  tags?: string[];
}

export const MOON_TEMPLATES: Record<string, Template[]> = {
  forge: [
    { id: "f1", label: "Build me a plan", prompt: "I want to build [describe your idea]. Give me a concrete step-by-step plan — what to build first, what tools to use, and how to get it live." },
    { id: "f2", label: "Turn idea → MVP", prompt: "My idea is: [describe it]. Strip it down to the smallest version I can launch this week. Tell me exactly what to build and what to skip." },
    { id: "f3", label: "Stack recommendation", prompt: "I'm building [type of app] for [use case]. I want something cheap to run and easy to maintain. What tech stack should I use and why?" },
    { id: "f4", label: "Name my project", prompt: "I'm building [describe your project]. Give me 10 name ideas — short, memorable, not taken, domain-friendly. Explain why each one works." },
    { id: "f5", label: "Fix my workflow", prompt: "My current workflow is: [describe it]. Find the biggest waste of time or the weakest link and tell me exactly how to fix it." },
    { id: "f6", label: "Monetize this", prompt: "I built [describe project]. How do I charge for this? Give me 3 concrete pricing models with the pros and cons of each." },
    { id: "f7", label: "Debug my thinking", prompt: "I'm stuck on [describe the problem]. I've tried [what you've tried]. What am I missing? Push back on my assumptions." },
  ],
  hawk: [
    { id: "h1", label: "Competitor breakdown", prompt: "Who are the top 5 competitors to [your product or idea]? For each one: pricing, target customer, biggest weakness, and the gap I can exploit." },
    { id: "h2", label: "Market research", prompt: "I want to sell [product/service] to [target customer]. What does this market look like? Size, growth, main players, and who's underserved." },
    { id: "h3", label: "Find suppliers", prompt: "I need to source [product/material] for my business. Find me real supplier options with estimated pricing, MOQs, and who ships to [country]." },
    { id: "h4", label: "Price check", prompt: "What's a fair price to charge for [product or service]? Research what competitors charge and what customers are willing to pay." },
    { id: "h5", label: "Customer research", prompt: "Who is the ideal buyer for [product/service]? Give me a real profile — job title, pain point, what they've already tried, where they hang out online." },
    { id: "h6", label: "Find a freelancer", prompt: "I need to hire a [role] for [type of work]. Where should I look, what should I pay, and what questions should I ask to screen them?" },
    { id: "h7", label: "Tech stack research", prompt: "What's the best tool for [use case]? Research the top 3 options, compare them on cost, ease of use, and reliability, and give me a clear recommendation." },
  ],
  sage: [
    { id: "s1", label: "Explain like I'm 10", prompt: "Explain [concept/technology] to me like I've never heard of it. Use a real-world analogy. No jargon." },
    { id: "s2", label: "How does X work?", prompt: "How does [technology, system, or concept] actually work under the hood? Give me the real explanation, step by step." },
    { id: "s3", label: "Learning roadmap", prompt: "I want to learn [skill/technology] from scratch. I have [X hours per week] to practice. Give me a realistic 30-day roadmap with what to study each week." },
    { id: "s4", label: "Explain a document", prompt: "Here's a document I don't fully understand: [paste it]. Explain the key points in plain English and flag anything I should pay attention to." },
    { id: "s5", label: "Teach me in 5 minutes", prompt: "Give me a 5-minute crash course on [topic]. Just the essentials — what it is, why it matters, and one thing I can do right now to use this knowledge." },
    { id: "s6", label: "Spot my mistake", prompt: "Here's my understanding of [concept]: [explain what you think]. What am I getting wrong? Correct me and fill in the gaps." },
    { id: "s7", label: "Practice questions", prompt: "I'm studying [topic]. Give me 10 practice questions that test real understanding — not just memorization. Include the answers." },
  ],
  flint: [
    { id: "fl1", label: "Diagnose my problem", prompt: "My [device/app/system] is [describe the problem]. What's most likely causing it and what's the fastest way to fix it?" },
    { id: "fl2", label: "Speed up my PC", prompt: "My computer feels slow. Walk me through the most effective free things I can do to make it faster, starting with the highest impact." },
    { id: "fl3", label: "Free tool for this", prompt: "I need to [task]. What's the best free tool or software for this? Don't give me a list — pick the one best option and tell me how to set it up." },
    { id: "fl4", label: "Set up a server", prompt: "I want to host [type of app] on my own server. Walk me through setting it up from scratch — I have [level of experience] with servers." },
    { id: "fl5", label: "Network troubleshoot", prompt: "My internet is [describe the problem]. Walk me through diagnosing and fixing it, step by step, in plain English." },
    { id: "fl6", label: "What's using my data?", prompt: "I want to find out what's running in the background on my computer and using my data or slowing things down. Walk me through it." },
    { id: "fl7", label: "Backup my stuff", prompt: "I need to set up a reliable backup for [what you want to protect]. Walk me through the simplest, most reliable way to do it for free." },
  ],
  quill: [
    { id: "q1", label: "Cold email", prompt: "Write a cold email to [type of prospect] about [what you're offering]. It should be short, specific, and not sound like a sales pitch. Include a clear ask." },
    { id: "q2", label: "LinkedIn post", prompt: "Write a LinkedIn post about [topic or thing you built]. Make it authentic and direct — no hollow buzzwords, no humble bragging. Just say the real thing." },
    { id: "q3", label: "Bio / About me", prompt: "Write a professional bio for me. I'm [describe yourself, your work, your background]. Keep it under 150 words, honest, and specific." },
    { id: "q4", label: "Proposal / pitch", prompt: "Write a business proposal for [project or service] targeting [client type]. Include the problem, solution, what I'll deliver, timeline, and pricing." },
    { id: "q5", label: "Follow-up email", prompt: "Write a follow-up email for [context — e.g. a job interview, a sales meeting, a pitch]. Be direct, professional, and short. Don't be desperate." },
    { id: "q6", label: "Product description", prompt: "Write a product description for [product]. Target customer: [who]. The tone should be [tone]. Make it punchy, specific, and honest." },
    { id: "q7", label: "Social media caption", prompt: "Write 5 caption options for a post about [topic]. Platform: [Instagram/Twitter/LinkedIn]. Tone: [describe]. Keep each one under 3 sentences." },
  ],
  creed: [
    { id: "cr1", label: "30-day challenge", prompt: "Build me a 30-day challenge to help me [goal — e.g. learn a skill, build a habit, get fit]. Be specific. Give me daily actions, not vague advice." },
    { id: "cr2", label: "Training plan", prompt: "Build a training plan for [goal]. I have [X days per week] and [equipment or constraints]. Make it realistic and progressive." },
    { id: "cr3", label: "Daily routine", prompt: "Design a daily routine for someone who wants to [goal]. Include morning, work blocks, and evening. Be realistic — I have [constraints]." },
    { id: "cr4", label: "Break a bad habit", prompt: "I have a bad habit of [habit]. I've tried to stop before but [what happened]. Give me a real strategy to break it, backed by how habits actually work." },
    { id: "cr5", label: "Skill fast-track", prompt: "I want to get good at [skill] as fast as possible. I can practice [X hours per day]. Give me the highest-leverage activities and tell me what to skip." },
    { id: "cr6", label: "Accountability system", prompt: "I keep failing to stick to [goal]. Design an accountability system that would actually work for me — tools, check-ins, consequences, and rewards." },
    { id: "cr7", label: "Mental toughness", prompt: "I struggle with [challenge — e.g. procrastination, self-doubt, distraction]. Give me practical strategies to build mental toughness and push through it." },
  ],
  brainstorm: [
    { id: "b1", label: "Idea expansion", prompt: "My idea is: [describe it]. Push it further. What's the version that's 10x more ambitious? What's the version I could build this weekend? What angle am I not seeing?" },
    { id: "b2", label: "Problem → business", prompt: "I've noticed [problem you've experienced]. Help me turn this into a real business. Who has this problem, how bad is it, and what would they pay to solve it?" },
    { id: "b3", label: "Name brainstorm", prompt: "Help me brainstorm names for [project/product/company]. It should feel [describe vibe]. Give me 20 options — weird, clever, and safe. I'll pick." },
    { id: "b4", label: "Pivot ideas", prompt: "My original idea was [describe it]. It's not working because [reason]. Give me 5 pivot options that keep my core strengths but change what I'm building or who I'm selling to." },
    { id: "b5", label: "Side hustle ideas", prompt: "Based on my skills in [your skills], give me 5 realistic side hustle ideas I could start this month. Be specific about how each one makes money." },
    { id: "b6", label: "Validate this idea", prompt: "I have this idea: [describe it]. How do I validate it without building anything? Give me a concrete 1-week validation plan." },
    { id: "b7", label: "Unique angle", prompt: "Everyone is doing [common thing in your space]. What's the contrarian angle that nobody is taking? Help me think about this differently." },
  ],
};
