import type { Metadata } from "next";
import "./globals.css";
export const metadata:Metadata={title:"Career Workshop — Career workspace",description:"A private workspace for opportunities, applications and next actions.",icons:{icon:"/favicon.svg"}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en-GB"><body>{children}</body></html>;}
