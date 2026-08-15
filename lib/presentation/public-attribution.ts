export const PUBLIC_INTERPRETATION_LABEL_ZH="易老师综合解读";
export const PUBLIC_MARKET_VIEW_LABEL_ZH="易老师市场研判";
export const PUBLIC_INTERPRETATION_LABEL_EN="Yi interpretation";
export const PUBLIC_MARKET_VIEW_LABEL_EN="Yi market view";
export const PUBLIC_ATTRIBUTION_DISCLOSURE_ZH="易老师方法体系融合传统术数、技术结构、宏观事件、新闻与公开市场信息形成独立判断；AI仅辅助归并、冲突检查与情景推演。";
export const PUBLIC_ATTRIBUTION_DISCLOSURE_EN="Independent market interpretation under Yi's methodology, combining traditional methods, technical structure, macro events, news and public market information. AI only assists synthesis, conflict checks and scenario analysis.";

type PrivatePublicKey="postUrl"|"postId"|"rawPost"|"rawText"|"postText"|"rawExcerpt"|"postExcerpt"|"postExcerptZh"|"postExcerptEn"|"sourceArtifact"|"sourceArtifacts"|"sourceArtifactId"|"relativePath"|"artifactPath"|"internalSourceRef"|"sourceIds"|"sourceUrl"|"sourceUrls"|"handle"|"username"|"userName"|"teacher";
export type PublicProjection<T>=T extends Date?string:T extends readonly (infer U)[]?PublicProjection<U>[]:T extends object?{[K in keyof T as K extends PrivatePublicKey?never:K extends `${string}SourceId`|`${string}SourceIds`?never:K extends "teacherInterpretation"?"methodInterpretation":K extends "teacherClaim"?"researchMaterialSummary":K]:PublicProjection<T[K]>}:T;
type Locale="zh"|"en";
type PublicAudience="MEMBER"|"PUBLIC"|"ADMIN";

const PRIVATE_KEYS=new Set(["posturl","postid","rawpost","rawtext","posttext","rawexcerpt","postexcerpt","postexcerptzh","postexcerpten","sourceartifact","sourceartifacts","sourceartifactid","relativepath","artifactpath","internalsourceref","sourceids","sourceurl","sourceurls","handle","username","teacher"]);
const PRIVATE_KEY_PATTERN=/^(?:post(?:id|url|text|.*excerpt)|raw(?:post|text|.*excerpt)|.*sourceids?|source.*(?:url|urls|artifact|artifacts|path)|.*artifact.*path|relativepath|internalsourceref|handle|username|teacher)$/i;
const PRIVATE_TOKENS=/@[A-Za-z0-9_]+|\b(?:MAT78704|BTCTW0|BTCKIK|Stone|NANA|WOLF|GAOSHAN)\b|teacher[- ]method review|teacher(?:'s|[- ](?:supplied|claim|method|material|notes?|prediction|rules?))?|external analyst|public analyst|老师提供|老师法(?:复核(?:后|版)?)?|老师笔记(?:复核版)?|外部同周期六爻|(?<!易)老师|乔乔|狼叔|高山说缠论|MOOX验证某人/gi;

const interpretationLabel=(locale:Locale)=>locale==="en"?PUBLIC_INTERPRETATION_LABEL_EN:PUBLIC_INTERPRETATION_LABEL_ZH;
export function publicAttributionText(value:string,locale:Locale="zh"){return value.replace(/\bTEACHER_/g,"SOURCE_").replace(PRIVATE_TOKENS,interpretationLabel(locale)).replace(/\s{2,}/g," ").trim();}
function childLocale(key:string,fallback:Locale):Locale{return /(?:en|english)$/i.test(key)?"en":/(?:zh|zhcn|chinese)$/i.test(key)?"zh":fallback;}
function sourceLabel(key:string,locale:Locale){if(/en$/i.test(key))return PUBLIC_INTERPRETATION_LABEL_EN;if(/zh/i.test(key))return PUBLIC_INTERPRETATION_LABEL_ZH;return interpretationLabel(locale);}

export function projectPublicAttribution<T>(value:T,options:{locale?:Locale}={}):PublicProjection<T>{
  const locale=options.locale??"zh";
  if(value instanceof Date)return value.toISOString() as PublicProjection<T>;
  if(typeof value==="string")return publicAttributionText(value,locale) as PublicProjection<T>;
  if(Array.isArray(value))return value.map(item=>projectPublicAttribution(item,{locale})) as PublicProjection<T>;
  if(value&&typeof value==="object"){
    const output:Record<string,unknown>={};
    const canonicalKeys=new Set(Object.keys(value as Record<string,unknown>).map(key=>key.replace(/[^A-Za-z0-9]/g,"").toLowerCase()));
    const storedPostRow=canonicalKeys.has("postid")&&canonicalKeys.has("posturl")&&canonicalKeys.has("username")&&canonicalKeys.has("text");
    for(const [key,item] of Object.entries(value as Record<string,unknown>)){
      const normalized=key.replace(/[^A-Za-z0-9]/g,"").toLowerCase();if(PRIVATE_KEYS.has(normalized)||PRIVATE_KEY_PATTERN.test(normalized))continue;
      if(storedPostRow&&(normalized==="text"||normalized==="parsed"))continue;
      if(normalized==="teacherinterpretation"){output.methodInterpretation=projectPublicAttribution(item,{locale:childLocale(key,locale)});continue;}
      if(normalized==="teacherclaim"){output.researchMaterialSummary=projectPublicAttribution(item,{locale:childLocale(key,locale)});continue;}
      if(/^sourcelabel(?:zh|en)?$/i.test(key)){output[key]=sourceLabel(key,locale);continue;}
      if(/^(?:sourcetype|sourcecategory|sourcefamily)$/i.test(key)){output[key]="PUBLIC_MARKET_RESEARCH";continue;}
      output[key]=projectPublicAttribution(item,{locale:childLocale(key,locale)});
    }
    return output as PublicProjection<T>;
  }
  return value as PublicProjection<T>;
}
export function projectAttributionForAudience<T>(
  value:T,
  options:{audience:PublicAudience;locale?:Locale},
):T|PublicProjection<T>{
  return options.audience==="ADMIN"?value:projectPublicAttribution(value,{locale:options.locale});
}
export function projectPublicResearchRadar<T extends {stone:unknown}>(value:T,locale:Locale="zh"):Omit<PublicProjection<T>,"stone">&{macroLiquidity:PublicProjection<T["stone"]>}{
  const projected=projectPublicAttribution(value,{locale});const {stone,...rest}=projected;return {...rest,macroLiquidity:stone as PublicProjection<T["stone"]>};
}
