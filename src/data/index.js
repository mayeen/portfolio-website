// Single access point for portfolio content.
// Phase 3 replaces these static imports with a fetch from /api/content,
// keeping these JSON files as the offline fallback.
import profile from './profile.json';
import experience from './experience.json';
import education from './education.json';
import skills from './skills.json';
import projects from './projects.json';
import certifications from './certifications.json';

export { profile, experience, education, skills, projects, certifications };
