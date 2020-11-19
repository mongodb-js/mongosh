export default function redactPassword(uri: string): string {
  const regex = /(?<=\/\/)(.*)(?=\@)/g;
  return uri.replace(regex, '<credentials>');
}
