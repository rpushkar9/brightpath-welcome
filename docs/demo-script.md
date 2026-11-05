# Demo script

The target is 4 minutes 30 seconds, and the assignment allows 2 to 5 minutes. The timings assume 145 spoken words a minute plus about 40 seconds of clicks. They are estimates until you rehearse aloud.

## Before you record

1. Record on a weekday. On a weekend, Emily no longer appears on the first day.
2. Use one full-size browser window, at least 1280 pixels wide, with the zoom at 100%. In a narrower window the app switches to its phone layout and hides the sidebar.
3. Open the app. When the tour card appears, clear **Open this tour on every reload**, then click **Skip tour**. This stops tours opening by themselves on camera.
4. Open the **View as** menu and choose **Reset demo data**, so dates and progress are fresh.
5. Open three tabs, in this order:
   - Tab 1: `#/me/emily-carter`
   - Tab 2: `#/me/marcus-webb`
   - Tab 3: `docs/ai-review-log.md` on GitHub
6. Rehearse once, then reset the demo data again. Start recording on tab 1.

## 0:00 The problem, and who this is for (35 seconds)

> BrightPath has about 150 people. Onboarding lives in emails, documents, spreadsheets, and HR messages, so new hires miss steps, and managers can't tell what got done.
>
> I built one place for three people. Emily, a new hire, asks what to do next. David, a manager, asks who needs attention. Sarah, in HR, asks where the process needs fixing.

Click **Show me around**, then press Escape.

> Each role gets a guided tour, so anyone opening this gets walked through. I'll skip it.

## 0:35 The disagreement (25 seconds)

Point at the three tasks, then at the Engineering label.

> The customer had a disagreement. David says departments need different tasks. Emily doesn't want 40 things on day one. Those don't conflict. David means which tasks exist, and Emily means how many appear at once.
>
> So Emily's plan has 18 tasks, 7 of them for Engineering. This screen shows three, and says where to start.

## 1:00 Emily (40 seconds)

Click **Mark complete**. Point at the counts and the next task.

> When Emily finishes a task, progress updates and the next one moves up, with Undo for mistakes. The screen says this is only Emily's confirmation, not a submission.

Point at **Waiting on someone else**. Click **Ask for help**, then **Send request**.

> Emily can't run the local setup until IT grants access. The app says who owns that, and doesn't count it against Emily. One click sends a prepared request.

Type "Who can help me with repository access?" and press Enter. Point at the sidebar.

> Questions are answered from Emily's own plan, using simple rules, and the panel says it isn't AI. Emily's manager and HR are always in the sidebar.

## 1:40 A different department (10 seconds)

Switch to tab 2.

> Marcus is in Sales, so the department tasks are different. Overdue work comes first, worded calmly.

## 1:50 David (30 seconds)

Use **View as** to open **David Park**. Point at Priya's card, then **With IT or HR**, then **What changed since your last visit**.

> David's page answers one question: who needs help. Priya's card says why, and what to do. Work stuck with IT is kept apart from David's own tasks, so nobody chases the wrong person.
>
> Here's the task Emily just finished, from a real activity log.

Click **Nudge Priya**.

> A nudge appears in Priya's workspace. No email goes out, and the screen says so.

## 2:20 Sarah (30 seconds)

Use **View as** to open **Sarah Mitchell**. In **Help requests**, click **Mark resolved** on Emily's request. On Tomás's card, click **Open task**, then **Mark complete**, and press Escape.

> Sarah sees every team, and stands in for IT here, so Emily's request came to Sarah. Resolving it updates Emily's screen.
>
> Tomás is flagged because an IT task is late. Nudging Tomás wouldn't help, so the app doesn't offer that. Sarah clears it, and Tomás leaves this list.

## 2:50 Where people get stuck (35 seconds)

Click **Insights**. Open **Create CRM account**, and click **Propose a plan improvement**.

> This is what I'd most like Sarah to see. Fixing one person's problem doesn't fix the process, so this shows which tasks trip up more than one hire. CRM access affected all three Sales hires.
>
> I was careful about what it claims. The screen says it's a small sample, counts each person once, and lists what the records can't show. A suggestion is labelled as one, and a proposal never changes anyone's plan.

## 3:25 What I guessed (15 seconds)

> I wrote down my assumptions. Three that matter: Emily is in Engineering, upcoming tasks can't be completed early, and "needs attention" means two overdue tasks, or one that's three business days late.

## 3:40 What I left out, and what I'd ask next (20 seconds)

> I left out real login, documents, e-signature, email, a template editor, and a real AI model. A model would need a secure backend, and should only answer from sources it can cite.
>
> Next, I'd ask Sarah which tasks every department must do, which dates are legally fixed, and who chases IT today.

## 4:00 How I checked it, and time (30 seconds)

Switch to tab 3.

> I built this with Claude Code. Tests cover bad input, corrupted data, and bad links, and I kept a log of what reviews caught. Once, every test passed while a spotlight pointed at empty space, and I only saw it by looking.
>
> The first version took about three hours fifteen, past the limit. The redesign and Insights came after that, and the commit history shows where.

## If something goes wrong while recording

- To restart, use **View as**, then **Reset demo data**, in tab 1. Then reload tab 2 on Marcus.
- If a date looks off, reset. Dates are set when the sample data is created.
- If you run long, cut the Marcus section first, then the typed question.
