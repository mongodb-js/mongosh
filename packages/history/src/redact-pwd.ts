export default function retractPassword(uri: string): string {
  const regex = /(?<=\/\/)(.*)(?=\@)/g;
  return uri.replace(regex, '<credentials>');
}
