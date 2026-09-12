import React from "react";
import { createRoot } from "react-dom/client";
import { LocaleProvider } from "../../lib/i18n/LocaleProvider";
import { MemberOperationDesk } from "../../components/member/MemberOperationDesk";
createRoot(document.getElementById("root")!).render(<LocaleProvider initialLocale={location.search.includes("en") ? "en" : "zh-CN"} messages={{}}><div className="bg-amber-900 p-2 text-center">QA ONLY · FICTIONAL PRICES · NOT A FORECAST</div><MemberOperationDesk /></LocaleProvider>);
