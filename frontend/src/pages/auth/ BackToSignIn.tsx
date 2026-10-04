import { Link } from "react-router-dom";
/** The "<- Back to Sign In" link sharedby thethree secondary auth screens. */
export default function BackToSignIn() {
return (
<Link
to="/"
style={{
marginTop: 20,
fontSize: 13.5,
fontWeight: 700,
color: "var(--c-brand)",
textDecoration: "none",
}}
>
&larr; Back to Sign In
</Link>
);
}