class DurableObject {
  constructor(state: any, env: any) {}
  ctx = {
    async getAlarm() {
      return undefined;
    },
    async setAlarm(time: number) {},
  };
}

export { DurableObject };
