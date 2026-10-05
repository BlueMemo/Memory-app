"use client";

import Link from "next/link";
import { useI18n } from "@/i18n";
import { BRANCHES, ROOT_SKILLS, type Skill } from "@/lib/skillTree";

/**
 * /skills, the Memory Tree: the basic techniques as roots, and a branch per area (numbers, geography, ...)
 * whose skills build on each other from top to bottom. Skills without content yet show "Coming soon".
 */
export function SkillTreeView() {
  const t = useI18n().t.skills;
  return (
    <main className="page skill-tree-page">
      <section className="page-intro">
        <h1>{t.title}</h1>
        <p>{t.lead}</p>
      </section>

      <section className="tree-roots" aria-labelledby="tree-roots-title">
        <h2 id="tree-roots-title">{t.rootsTitle}</h2>
        <p className="muted">{t.rootsLead}</p>
        <ul className="tree-root-list">
          {ROOT_SKILLS.map((skill) => (
            <li key={skill.id}>
              <SkillNode skill={skill} />
            </li>
          ))}
        </ul>
      </section>

      <div className="tree-trunk" aria-hidden="true" />

      <section aria-labelledby="tree-branches-title">
        <h2 id="tree-branches-title" className="visually-hidden">
          {t.branchesTitle}
        </h2>
        <ul className="tree-branches">
          {BRANCHES.map((branch) => (
            <li key={branch.id} className="tree-branch">
              <h3 className="tree-branch-title">{t.branches[branch.id as keyof typeof t.branches]}</h3>
              <ol className="tree-branch-skills">
                {branch.skills.map((skill) => (
                  <li key={skill.id}>
                    <SkillNode skill={skill} />
                  </li>
                ))}
              </ol>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

function SkillNode({ skill }: { skill: Skill }) {
  const t = useI18n().t.skills;
  const text = t.nodes[skill.id as keyof typeof t.nodes];
  const body = (
    <>
      <span className="skill-dot" aria-hidden="true" />
      <strong>{text.title}</strong>
      <span className="skill-text">{text.text}</span>
      <span className="skill-status">{skill.href ? `${t.open} →` : t.comingSoon}</span>
    </>
  );
  return skill.href ? (
    <Link href={skill.href} className="skill-node available">
      {body}
    </Link>
  ) : (
    <div className="skill-node">{body}</div>
  );
}
