import React from 'react';
import LogoWithImage from './LogoWithImage';
import CourseTabRow from './CourseTabRow';
import {
  contributorCategories,
  Contributor,
} from '../data/contributorsData';

const PUBLIC_URL = process.env.PUBLIC_URL || '';

const resolveLogo = (logo?: string): string | undefined => {
  if (!logo) return undefined;
  if (logo.startsWith('http') || logo.startsWith('data:')) return logo;
  return `${PUBLIC_URL}${logo.startsWith('/') ? '' : '/'}${logo}`;
};

interface ContributorCardProps {
  contributor: Contributor;
  showTile?: boolean;
}

const ContributorCard: React.FC<ContributorCardProps> = ({ contributor, showTile = true }) => {
  const logoSrc = resolveLogo(contributor.logo);
  const members = contributor.membersAr ?? [];

  return (
    <div className="w-[290px] sm:w-[330px] flex flex-col items-center text-center bg-white border-2 border-[#84333c] rounded-2xl p-4 gap-3 transition-transform duration-150 hover:scale-[1.03] hover:shadow-[0_8px_24px_rgba(132,51,60,0.18)]">
      {showTile && (
        <div className="w-[110px] h-[110px] lg:w-[120px] lg:h-[120px] rounded-xl bg-[#faf7f7] border border-[#eadfe1] flex items-center justify-center overflow-hidden p-2">
          {logoSrc ? (
            <img
              src={logoSrc}
              alt={contributor.nameAr}
              loading="lazy"
              className="max-w-full max-h-full object-contain block"
            />
          ) : (
            <span className="w-[58px] h-[58px] rounded-full bg-[#f7e9eb] flex items-center justify-center text-[1.4em] font-bold text-[#84333c] leading-none select-none px-1">
              {contributor.nameAr.trim().split(/\s+/)[0]}
            </span>
          )}
        </div>
      )}
      <div className="font-bold text-[#5a2428] text-[0.95em] leading-snug">
        {contributor.nameAr}
      </div>
      {contributor.subtitleAr && (
        <div className="text-[0.8em] text-[#84333c]">{contributor.subtitleAr}</div>
      )}
      {members.length > 0 && (
        <ul className="text-[0.8em] text-[#6b5c5e] leading-relaxed list-none p-0 m-0">
          {members.map((member) => (
            <li key={member}>{member}</li>
          ))}
        </ul>
      )}
    </div>
  );
};

const ContributorsIndex: React.FC = () => {
  return (
    <div className="bg-white rounded-xl shadow-[0_8px_20px_rgba(0,0,0,0.15)] border-[3px] border-[#84333c] p-[30px] lg:p-[40px_30px_30px_30px] mt-10 mx-auto relative w-full max-w-[1100px] lg:max-w-[98vw]">
      <div className="hidden lg:flex absolute top-[25px] right-[25px] z-[100] bg-white rounded-md border-2 border-[#84333c] w-[150px] h-[150px] lg:w-[200px] lg:h-[200px] p-[10px] items-center justify-center">
        <LogoWithImage logoPath="qra-logo.svg" className="w-full h-auto block" />
      </div>

      {/* Arabic-only page: the nav stays in Arabic regardless of the app-wide course. */}
      <CourseTabRow forceArabic />

      <div className="text-center text-[2.2em] text-[#84333c] mb-[10px] font-bold drop-shadow-[1px_1px_2px_rgba(255,255,255,0.8)]">
        المساهمون والشركاء
      </div>

      <p className="text-center text-[#5a2428] text-[1.05em] mb-[35px] max-w-[720px] mx-auto">
        الشركاء والمساهمون الذين كان لدعمهم الدور الأكبر في إنجاز هذه المنصة.
      </p>

      <div className="flex flex-col gap-[38px]">
        {contributorCategories.map((category) => (
          <section key={category.id}>
            <h2 className="text-[1.4em] font-bold text-[#84333c] mb-[18px] pb-[8px] border-b-2 border-[#e7cdd1]">
              {category.titleAr}
            </h2>
            <div className="flex flex-wrap justify-center gap-4 lg:gap-6">
              {category.contributors.map((contributor) => (
                <ContributorCard
                  key={`${category.id}-${contributor.id}`}
                  contributor={contributor}
                  showTile={category.id !== 'contributors'}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};

export default ContributorsIndex;
