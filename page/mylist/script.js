getMyList().then((myList) => {
    console.log(myList);
});

async function getMyList() {
    const mylist = await fetch("/mylist.json").then((res) => res.json());
    return mylist;
}
