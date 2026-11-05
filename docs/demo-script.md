# Demo script

The timings below are estimates, because nobody has rehearsed this aloud yet. The target is about 4 minutes 30 seconds, and the assignment allows 2 to 5 minutes.

## Before you record

1. Record on a weekday. On a weekend, Emily no longer appears on the first day.
2. Open the **View as** menu and choose **Reset demo data**, so dates and progress are fresh.
3. Open two browser windows side by side:
   - Left: `#/me/emily-carter`
   - Right: `#/team/david`
4. Rehearse the new plan form once, then reset again.

## 0:00 What this is and who it is for (30 seconds)

Show Emily's home screen.

> BrightPath has about 150 employees and hires several people a month. Onboarding lives across emails, documents, spreadsheets, and messages from HR, so new hires miss steps and managers cannot tell what got done.
>
> I built one place for this. It serves the new hire first, because Sarah in HR said the goal is to make this easier "especially" for new employees. Managers and HR use the same data.

## 0:30 How I handled the disagreement (30 seconds)

Point at the three tasks, then at the Engineering label.

> David, an engineering manager, doesn't want everyone on the same checklist. Emily, a new hire, doesn't want to see 40 things on day one. I don't think they disagree. David is talking about which tasks exist, and Emily is talking about how many appear at once.
>
> So Emily's plan has 18 tasks, 7 of them specific to Engineering. The first screen shows three, and it says where to start. Only 12 of the 18 belong to Emily. IT, HR, and David own the rest, and the screen keeps those counts apart.

## 1:00 The new hire experience (45 seconds)

Click **Mark complete**. Point out the progress and the next task moving up. Point at **Waiting on someone else**, then click **Ask for help** and **Send request**.

> When Emily finishes a task, progress updates right away and the next task moves up, and Undo is there for mistakes.
>
> New hires have a lot of questions, so asking is easy. Emily can't run the local setup until IT grants access. The app says so, and one click sends a prepared request to the person who can fix it. I can also type a question. These answers come from Emily's real plan using simple rules, and the panel says it isn't AI.

Type "Who can help me with repository access?" and press Enter. Click **See the full plan**.

> The whole plan is one click away, grouped by phase. That covers Sarah's request for one place with everything in it.

## 1:45 Department differences (15 seconds)

Use **View as** to open Marcus Webb, then the full plan.

> Marcus is in Sales, so the department tasks are different, and the overdue work comes first, worded calmly.

## 2:00 Manager visibility (40 seconds)

Put the left window back on Emily's home screen. Complete a task on the left and point at the right.

> Here's David's view. The headline answers the manager's question: one person needs your help. When Emily finishes a task on the left, David's roster updates on the right.
>
> The card says who, why, and what to do next. David can nudge Priya, and I didn't build email, so the screen says the nudge stays in the app.

Click **Nudge Priya**.

## 2:40 HR and starting a plan (40 seconds)

Switch the right window to **Sarah Mitchell**. Point at **Help requests**, click **Mark resolved** on Emily's request, then point at Tomás's card and click **Open task**, **Mark complete**, and close the drawer.

> Emily's request is already here for Sarah, and resolving it updates Emily's screen. Tomás is flagged because an IT task is late, so nudging Tomás wouldn't help, and the app doesn't offer that. Sarah clears the task here, and Tomás can move on.

Click **Start a new plan**. Click **Start plan** with empty fields. Choose Engineering, then Sales.

> Sarah's request says that eventually, plans should be created from a role or department. I didn't build a rule engine, but this shows the idea. Bad input is rejected, and choosing a department changes the plan.

## 3:20 What I guessed (30 seconds)

> The request left a lot open, so I made assumptions and wrote them down. Two that matter: upcoming tasks can't be completed early, and "Needs attention" means two overdue tasks or one that's three business days late.

## 3:50 What I left out, and what I'd ask Sarah (30 seconds)

> I left out real login, documents, e-signature, email, a template editor, and a real AI model, which would need a secure backend. MangoApps' public site already advertises template matching and AI-drafted plans, so I focused on the moment a new hire asks what to do first.
>
> Next, I'd ask Sarah four things. Which tasks must every department do? Which dates are legally fixed? What would actually make you step in for a new hire? And who chases IT today?
>
> Today's answers use simple rules, and the screen says so. Next, I'd put a model behind a secure backend. It could only answer from approved sources it cites, and sensitive questions would go to HR. It could never mark a task done or judge an employee.

## 4:20 How I checked the AI's work (15 seconds)

Show `docs/ai-review-log.md` briefly.

> I built this with Claude Code, with independent AI reviews, and kept a log of what I caught. One example: every test passed while the tour's spotlight pointed at empty space. I only saw it by looking, so I added tests for it.

## If something goes wrong while recording

- To restart, use **View as**, then **Reset demo data**.
- If a date looks off, reset. Dates are set when the sample data is created.
