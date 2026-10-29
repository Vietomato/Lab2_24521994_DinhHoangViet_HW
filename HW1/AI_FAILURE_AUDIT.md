AI_FAILURE_AUDIT — HW1: Accessible Data Grid
- Student: Đinh Hoàng Việt — 24521994
- Stack: React + TypeScript + Vite
- Method: verify AI instructions using terminal output, identify failures, apply manual corrections, and check the results.
1. Scope and Evidence Sources
This report uses the uploaded conversation transcript and the terminal logs provided in the current HW1 guidance conversation. The uploaded transcript covers only the work through task 2.1; it is not the complete project history.

The three entries below concern AI guidance and development configuration. They are not three demonstrated runtime, security, or accessibility defects in the Data Grid. There is no evidence of XSS, memory leaks, or random React keys in the supplied material, so those issues are not presented as observed failures.

The log excerpts are reproduced from the conversation. Separate log files and DevTools evidence are not attached to this report. If the grading rubric specifically requires DevTools evidence or defects in UI code, additional documented cases will be necessary.
2. Failure 01 — Retaining TypeScript Without Checking Tool Compatibility
Request and AI Output
The request was to configure React, Vite, and ESLint. The AI instructed the student to retain the existing TypeScript dependency and run:
npm install -D vite @vitejs/plugin-react @types/react @types/react-dom eslint @eslint/js typescript-eslint globals eslint-plugin-react-hooks eslint-plugin-jsx-a11y
Detection Evidence
The student ran the command and provided this output:
npm error ERESOLVE unable to resolve dependency tree
npm error Found: typescript@7.0.2
npm error peer typescript@">=4.8.4 <6.1.0" from typescript-eslint@8.72.1
Cause and Impact
The instructions did not compare the project's TypeScript version with the peer dependency declared by typescript-eslint. According to the installation log, TypeScript 7.0.2 was outside the supported range. npm therefore could not complete the toolchain installation.
Manual Correction
npm install -D typescript@~5.9.0
The correction selected a compatible compiler version rather than bypassing dependency checks with --force or --legacy-peer-deps.
Verification and Status
After the additional correction in Failure 02, the student supplied a screenshot of npm ls output showing typescript@5.9.3 and deduped entries, with no error visible in the captured portion. This confirms the compiler version change; it does not prove that all application checks passed.

Lesson: inspect existing versions and peer dependencies before recommending that a compiler version be retained or upgraded.
3. Failure 02 — Installing an ESLint Version Unsupported by jsx-a11y
AI Output That Triggered the Failure
After TypeScript was adjusted, the instructions still used the installation command above without constraining the major versions of eslint and @eslint/js.
Detection Evidence
npm error ERESOLVE could not resolve
npm error Found: eslint@10.13.0
npm error peerOptional eslint@"^10.0.0" from @eslint/js@10.0.1
npm error peer eslint@"^3 || ^4 || ^5 || ^6 || ^7 || ^8 || ^9"
npm error from eslint-plugin-jsx-a11y@6.10.2
Cause and Impact
The command selected package versions without ensuring that they were mutually compatible. According to the log, the installed accessibility plugin did not accept ESLint 10. Consequently, the accessibility linting toolchain could not be installed successfully.

This was a separate compatibility issue from Failure 01: changing TypeScript did not resolve the ESLint/plugin conflict.
Manual Correction
npm install -D vite @vitejs/plugin-react @types/react @types/react-dom eslint@9 @eslint/js@9 typescript-eslint globals eslint-plugin-react-hooks eslint-plugin-jsx-a11y
npm ls typescript eslint @eslint/js typescript-eslint eslint-plugin-react-hooks eslint-plugin-jsx-a11y
ESLint and @eslint/js were constrained to a compatible major version. Both package.json and package-lock.json should be tracked to preserve the dependency configuration.
Verification and Status
The subsequent terminal screenshot displayed eslint@9.39.5, typescript@5.9.3, and a returned PowerShell prompt, with no error visible in the captured portion. Actual lint execution still requires npm run lint after the configuration file has been created.

Lesson: check compatibility across the entire toolchain. A successful installation alone does not demonstrate successful linting or production builds.
4. Failure 03 — Running TypeScript Build Mode Before Creating tsconfig.json
AI Output That Triggered the Failure
While explaining how to verify the contracts, the AI instructed the student to run:
npx tsc -b
The instructions had not first established that scaffolding was complete or that tsconfig.json existed.
Detection Evidence
The student ran the command inside HW1 and provided:
error TS6053: File '.../HW1/tsconfig.json' not found.
Found 1 error.
Cause and Impact
The AI assumed that project setup had been completed, although the contracts had been written before the scaffolding task. TypeScript build mode requires a project configuration file. The missing configuration error was not a defect in ColumnDef or DataGridProps.

The incorrect sequence created extra troubleshooting work and prevented the intended contract verification.
Manual Correction
As an interim check, the files could be compiled directly using their actual paths:
npx tsc --noEmit --strict --target ES2020 --module ESNext --moduleResolution bundler src/types/data-grid.ts src/example/data-grid.example.ts
The student then completed task 1.1 by adding tsconfig.json, Vite and ESLint configuration, and the application entry points. A type-checking script was added:
{
  "scripts": {
    "typecheck": "tsc --noEmit"
  }
}
This is only the relevant script fragment, not a replacement for the complete package.json.
Verification and Status
Later in the conversation, the student supplied the contents of tsconfig.json and output showing that npm run typecheck invoked tsc --noEmit. The next error concerned the missing ./App module, demonstrating that compilation had progressed beyond the missing-configuration failure. A later screenshot showed the React startup page running on localhost.

These observations establish that configuration was added and the startup page ran. They do not replace final logs for type checking, linting, or the production build.

Lesson: verify the working directory, scripts, compiler, and configuration before issuing validation commands. Follow the dependency order defined in the WBS.
5. Cases Not Classified as AI Failures
- The example file was located in src/example, while some commands referenced src/examples. The path mismatch is documented, but the proposed path must be distinguished from the location actually created by the student.
- app.tsx was initially outside src, and its filename did not match the ./App import. This is not attributed to incorrect generated code because the original instructions specified src/App.tsx.
- An empty ZIP and an outdated contract attachment led the AI to request updated files. There is insufficient basis to classify these responses as hallucinations.
- The uploaded transcript includes sortData code and verification examples, but no execution result demonstrating a defect. Mutation or unstable sorting is therefore not claimed as an observed failure.
6. Pre-submission Checklist
- [ ] Compare the quoted logs with the original history and add available screenshots or log files to evidence/.
- [ ] If checks are rerun, record the actual results of npm run typecheck, npm run lint, and npm run build.
- [ ] Confirm that configuration/process failures meet the grading criteria. If UI defects or DevTools evidence are required, add documented cases from later phases.
- [ ] Mark task 4.4 complete only after the evidence and rubric requirements have been satisfied.
These checklist items must not be marked complete solely because this report has been written.