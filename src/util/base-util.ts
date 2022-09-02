export const hasCommon = (a: any[], b: any[]): boolean => {
    for (const i of a)
        if (b.includes(i))
            return true;
    return false;
}

export const waitFor = (condition: () => any, callback: () => void)=>{
    if(!condition()) {
        window.setTimeout(waitFor.bind(null, condition, callback), 100); /* this checks the flag every 100 milliseconds*/
    } else {
        callback();
    }
}