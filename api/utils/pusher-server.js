import Pusher from 'pusher';

export const pusherServer = new Pusher({
    appId: "2084549",
    key: "51d51cc5bfc1c8ee90d4",
    secret: "b3a325fcecbfabc17f57",
    cluster: "eu",
    useTLS: true
});