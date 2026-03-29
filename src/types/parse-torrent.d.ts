declare module "parse-torrent" {
  const parseTorrent: (input: Buffer | string) => any;
  export default parseTorrent;
}
